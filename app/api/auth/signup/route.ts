import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
  name: z.string().min(2, "الاسم حرفين على الأقل"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 }
      );
    }
    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدم مسبقاً" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        role: "STUDENT",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Signup error:", e);
    const message = e instanceof Error ? e.message : String(e);
    let userMessage = "حدث خطأ أثناء إنشاء الحساب.";
    if (message.includes("DATABASE_URL") || message.includes("Environment variable not found")) {
      userMessage = "لم يتم ضبط قاعدة البيانات. أنشئ ملف .env وأضف سطر: DATABASE_URL=\"رابط_postgres\" ثم نفّذ: npm run db:push";
    } else if (message.includes("does not exist") || message.includes("Unknown table") || message.includes("relation") || message.includes("P1001") || message.includes("P2021")) {
      userMessage = "جدول المستخدمين غير موجود أو قاعدة البيانات غير متصلة. نفّذ: npm run db:push (بعد إضافة DATABASE_URL في .env)";
    } else if (process.env.NODE_ENV === "development" && message) {
      userMessage = message;
    }
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}
