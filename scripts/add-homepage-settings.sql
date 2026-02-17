-- إعدادات الصفحة الرئيسية: صورة المدرس + النصوص (اسم المنصة، عنوان الهيرو، الشعار)
-- شغّله من لوحة Neon → SQL Editor إذا الجدول غير موجود

CREATE TABLE IF NOT EXISTS "HomepageSetting" (
  id                  TEXT PRIMARY KEY DEFAULT 'default',
  teacher_image_url   TEXT,
  hero_title          TEXT,
  hero_slogan         TEXT,
  platform_name       TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إدراج الصف الافتراضي إن لم يكن موجوداً
INSERT INTO "HomepageSetting" (id, teacher_image_url, hero_title, hero_slogan, platform_name, updated_at)
VALUES (
  'default',
  '/instructor.png',
  'أستاذ / عصام محي',
  'ادرسها... يمكن تفهم المعلومة صح!',
  'منصة أستاذ عصام محي',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
