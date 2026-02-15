import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** إزالة طالب من دورة - للأدمن فقط */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; courseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id: userId, courseId } = await params;

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "التسجيل غير موجود" }, { status: 404 });
  }

  await prisma.enrollment.delete({
    where: { userId_courseId: { userId, courseId } },
  });

  return NextResponse.json({ success: true });
}
