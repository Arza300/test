import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(2, "الاسم حرفين على الأقل").optional(),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل").optional(),
}).refine((d) => d.name !== undefined || d.password !== undefined, {
  message: "أرسل الاسم أو كلمة المرور للتحديث",
});

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const data: { name?: string; password?: string } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
  if (parsed.data.password !== undefined) {
    data.password = await hash(parsed.data.password, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا يوجد شيء للتحديث" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: data as { name?: string; password?: string },
  });

  return NextResponse.json({ success: true });
}
