import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listActivationCodeUsages, listActivationCodeUsagesForTeacher } from "@/lib/db";

/** قائمة الطلاب الذين فعّلوا أكواداً — للأدمن/مساعد الأدمن/المدرّس. اختياري: courseId */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN" && session.user.role !== "TEACHER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId") || undefined;
    const rows =
      session.user.role === "TEACHER"
        ? await listActivationCodeUsagesForTeacher(session.user.id, courseId ?? null)
        : await listActivationCodeUsages(courseId ?? null);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Dashboard code activations GET:", error);
    return NextResponse.json({ error: "فشل جلب بيانات التفعيل" }, { status: 500 });
  }
}
