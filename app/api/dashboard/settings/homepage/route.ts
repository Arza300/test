import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getHomepageSettings, updateHomepageSettings } from "@/lib/db";

/** جلب إعدادات الصفحة الرئيسية — للأدمن */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const settings = await getHomepageSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Dashboard settings/homepage GET:", error);
    return NextResponse.json({ error: "فشل جلب الإعدادات" }, { status: 500 });
  }
}

/** تحديث إعدادات الصفحة الرئيسية — للأدمن */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let body: {
    teacherImageUrl?: string | null;
    heroTitle?: string | null;
    heroSlogan?: string | null;
    platformName?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  try {
    await updateHomepageSettings({
      teacher_image_url: body.teacherImageUrl !== undefined ? body.teacherImageUrl : undefined,
      hero_title: body.heroTitle !== undefined ? body.heroTitle : undefined,
      hero_slogan: body.heroSlogan !== undefined ? body.heroSlogan : undefined,
      platform_name: body.platformName !== undefined ? body.platformName : undefined,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Dashboard settings/homepage PUT:", error);
    if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("HomepageSetting")) {
      return NextResponse.json(
        { error: "جدول إعدادات الصفحة الرئيسية غير موجود. نفّذ سكربت scripts/add-homepage-settings.sql في Neon ثم أعد المحاولة." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "فشل حفظ الإعدادات" }, { status: 500 });
  }
}
