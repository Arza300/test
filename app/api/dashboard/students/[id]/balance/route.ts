import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id: studentId } = await params;
  let body: { amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "المبلغ غير صالح" }, { status: 400 });
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId, role: "STUDENT" },
  });
  if (!student) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: studentId },
    data: { balance: { increment: amount } },
  });

  return NextResponse.json({ success: true });
}
