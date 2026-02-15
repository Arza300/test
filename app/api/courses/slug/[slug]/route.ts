import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const course = await prisma.course.findFirst({
      where: { slug, isPublished: true },
      include: {
        category: true,
        lessons: { orderBy: { order: "asc" } },
      },
    });
    if (!course) {
      return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
    }
    return NextResponse.json(course);
  } catch (error) {
    console.error("API course by slug:", error);
    return NextResponse.json(
      { error: "فشل جلب الدورة" },
      { status: 500 }
    );
  }
}
