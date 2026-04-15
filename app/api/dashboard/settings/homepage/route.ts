import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getHomepageSettings, updateHomepageSettings } from "@/lib/db";
import { normalizeHeroHex } from "@/lib/hero-bg";

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
    headerLogoUrl?: string | null;
    primaryColor?: string | null;
    whatsappUrl?: string | null;
    facebookUrl?: string | null;
    pageTitle?: string | null;
    heroBgPreset?: string | null;
    heroBgCustomFrom?: string | null;
    heroBgCustomTo?: string | null;
    heroFloatImage1?: string | null;
    heroFloatImage2?: string | null;
    heroFloatImage3?: string | null;
    footerTitle?: string | null;
    footerTagline?: string | null;
    footerCopyright?: string | null;
    reviewsSectionTitle?: string | null;
    reviewsSectionSubtitle?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const header_logo_url =
    body.headerLogoUrl === undefined
      ? undefined
      : body.headerLogoUrl && String(body.headerLogoUrl).trim()
        ? String(body.headerLogoUrl).trim().slice(0, 4000)
        : null;

  let primary_color: string | null | undefined;
  if (body.primaryColor !== undefined) {
    if (body.primaryColor === null) {
      primary_color = null;
    } else {
      const n = normalizeHeroHex(String(body.primaryColor ?? ""));
      if (!n) {
        return NextResponse.json(
          { error: "لون المنصة الأساسي يجب أن يكون بصيغة #RRGGBB (مثال: #0ea5e9)" },
          { status: 400 },
        );
      }
      primary_color = n;
    }
  }

  let hero_bg_custom_from: string | null | undefined;
  let hero_bg_custom_to: string | null | undefined;
  const cf = body.heroBgCustomFrom;
  const ct = body.heroBgCustomTo;
  if (cf !== undefined || ct !== undefined) {
    if (cf === undefined || ct === undefined) {
      return NextResponse.json(
        { error: "يُرسل لونا التدرج المخصّص معاً أو لا يُرسلان" },
        { status: 400 },
      );
    }
    if (cf === null && ct === null) {
      hero_bg_custom_from = null;
      hero_bg_custom_to = null;
    } else {
      const na = normalizeHeroHex(String(cf ?? ""));
      const nb = normalizeHeroHex(String(ct ?? ""));
      if (!na || !nb) {
        return NextResponse.json(
          { error: "التدرج المخصّص يتطلب لونين بصيغة #RRGGBB (مثال: #1a1a2e)" },
          { status: 400 },
        );
      }
      hero_bg_custom_from = na;
      hero_bg_custom_to = nb;
    }
  }

  try {
    await updateHomepageSettings({
      teacher_image_url: body.teacherImageUrl !== undefined ? body.teacherImageUrl : undefined,
      hero_title: body.heroTitle !== undefined ? body.heroTitle : undefined,
      hero_slogan: body.heroSlogan !== undefined ? body.heroSlogan : undefined,
      platform_name: body.platformName !== undefined ? body.platformName : undefined,
      header_logo_url,
      primary_color,
      whatsapp_url: body.whatsappUrl !== undefined ? body.whatsappUrl : undefined,
      facebook_url: body.facebookUrl !== undefined ? body.facebookUrl : undefined,
      page_title: body.pageTitle !== undefined ? body.pageTitle : undefined,
      hero_bg_preset: body.heroBgPreset !== undefined ? body.heroBgPreset : undefined,
      hero_bg_custom_from,
      hero_bg_custom_to,
      hero_float_image_1: body.heroFloatImage1 !== undefined ? body.heroFloatImage1 : undefined,
      hero_float_image_2: body.heroFloatImage2 !== undefined ? body.heroFloatImage2 : undefined,
      hero_float_image_3: body.heroFloatImage3 !== undefined ? body.heroFloatImage3 : undefined,
      footer_title: body.footerTitle !== undefined ? body.footerTitle : undefined,
      footer_tagline: body.footerTagline !== undefined ? body.footerTagline : undefined,
      footer_copyright: body.footerCopyright !== undefined ? body.footerCopyright : undefined,
      reviews_section_title:
        body.reviewsSectionTitle !== undefined
          ? (body.reviewsSectionTitle && String(body.reviewsSectionTitle).trim()
              ? String(body.reviewsSectionTitle).trim().slice(0, 400)
              : null)
          : undefined,
      reviews_section_subtitle:
        body.reviewsSectionSubtitle !== undefined
          ? (body.reviewsSectionSubtitle && String(body.reviewsSectionSubtitle).trim()
              ? String(body.reviewsSectionSubtitle).trim().slice(0, 400)
              : null)
          : undefined,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Dashboard settings/homepage PUT:", error);
    const lower = msg.toLowerCase();
    // عمود ناقص (الجدول موجود لكن أعمدة واتساب/فيسبوك/عنوان التبويب غير موجودة)
    if (lower.includes("column") && lower.includes("does not exist")) {
      return NextResponse.json(
        { error: "أعمدة ناقصة في جدول الإعدادات. نفّذ في Neon السكربت: scripts/add-homepage-settings-whatsapp-facebook-title.sql ثم أعد المحاولة." },
        { status: 500 }
      );
    }
    // جدول غير موجود أصلاً
    if (lower.includes("does not exist") || lower.includes("relation") || lower.includes("homepagesetting")) {
      return NextResponse.json(
        { error: "جدول إعدادات الصفحة الرئيسية غير موجود. نفّذ سكربت scripts/add-homepage-settings.sql في Neon ثم أعد المحاولة." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "فشل حفظ الإعدادات" }, { status: 500 });
  }
}
