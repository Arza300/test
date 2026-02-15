import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ROLES = ["ADMIN", "ASSISTANT_ADMIN", "STUDENT"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  let body: { name?: string; email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const data: { name?: string; email?: string; role?: "ADMIN" | "ASSISTANT_ADMIN" | "STUDENT" } = {};
  if (body.name !== undefined && body.name.trim()) data.name = body.name.trim();
  if (body.email !== undefined && body.email.trim()) {
    const existing = await prisma.user.findFirst({
      where: { email: body.email.trim(), id: { not: id } },
    });
    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم لحساب آخر" }, { status: 400 });
    }
    data.email = body.email.trim();
  }
  if (body.role !== undefined && ROLES.includes(body.role as typeof ROLES[number])) {
    data.role = body.role as "ADMIN" | "ASSISTANT_ADMIN" | "STUDENT";
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا يوجد شيء للتحديث" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data,
  });

  return NextResponse.json({ success: true });
}
