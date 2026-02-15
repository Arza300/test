import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "يجب تسجيل الدخول كطالب" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json({ error: "معرف الدورة مطلوب" }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
  });
  if (!course) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }

  const existing = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId: session.user.id, courseId },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "مسجّل في هذه الدورة مسبقاً" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { balance: true },
  });
  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  const coursePrice = Number(course.price) || 0;
  const userBalance = Number(user.balance) || 0;

  if (coursePrice > 0 && userBalance < coursePrice) {
    const needed = coursePrice - userBalance;
    return NextResponse.json(
      {
        error: `رصيدك غير كافٍ. سعر الدورة: ${coursePrice.toFixed(2)} ج.م، رصيدك: ${userBalance.toFixed(2)} ج.م. تحتاج: ${needed.toFixed(2)} ج.م`,
        insufficientBalance: true,
        coursePrice,
        userBalance,
      },
      { status: 400 }
    );
  }

  // استخدام transaction لضمان خصم الرصيد والتسجيل معاً
  await prisma.$transaction(async (tx) => {
    if (coursePrice > 0) {
      await tx.user.update({
        where: { id: session.user.id },
        data: { balance: { decrement: coursePrice } },
      });
    }
    await tx.enrollment.create({
      data: {
        userId: session.user.id,
        courseId,
      },
    });
  });

  return NextResponse.json({
    success: true,
    message: coursePrice > 0 ? `تم التسجيل وخصم ${coursePrice.toFixed(2)} ج.م من رصيدك` : "تم التسجيل بنجاح",
  });
}
