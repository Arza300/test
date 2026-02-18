import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import type { User, UserRole, Course, Category, Review, HomepageSetting, Enrollment, ActivationCode, HomeworkSubmission, Lesson, Quiz, Question, QuestionOption, LiveStream, LiveStreamProvider } from "./types";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL غير معرّف");

/** عميل Neon — الاتصال المباشر بقاعدة البيانات Neon (بدون Prisma) */
export const sql = neon(connectionString);

/** تحويل مفتاح snake_case إلى camelCase */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** تحويل صف من قاعدة البيانات (snake_case) إلى شكل التطبيق (camelCase) */
function rowToCamel<T = Record<string, unknown>>(row: Record<string, unknown> | null): T | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = snakeToCamel(k);
    out[key] = v;
  }
  return out as T;
}

function rowsToCamel<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => rowToCamel(r) as T);
}

/** توليد معرّف فريد متوافق مع CUID */
function generateId(): string {
  const part = () => Math.random().toString(36).slice(2, 10);
  return "c" + part() + part() + Date.now().toString(36).slice(-6);
}

// ----- User -----
export async function getUserByEmail(email: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM "User" WHERE email = ${email} LIMIT 1`;
  return (rows[0] as User) ?? null;
}

/** تحويل الأرقام العربية ٠-٩ إلى إنجليزية */
function normalizeArabicDigits(s: string): string {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  let out = "";
  for (const c of s) {
    const i = arabic.indexOf(c);
    out += i >= 0 ? String(i) : c;
  }
  return out;
}

/** تسجيل الدخول بالبريد أو رقم الهاتف: إذا القيمة تحتوي @ نبحث بالبريد، وإلا بالرقم (مقارنة بعد حذف غير الأرقام وتوحيد صيغ 0 و 20) */
export async function getUserByEmailOrPhone(emailOrPhone: string): Promise<User | null> {
  const trimmed = emailOrPhone.trim();
  if (trimmed.includes("@")) {
    return getUserByEmail(trimmed);
  }
  const withWesternDigits = normalizeArabicDigits(trimmed);
  const digits = withWesternDigits.replace(/\D/g, "");
  if (digits.length < 10) return null;

  const matchByDigits = async (norm: string) => {
    const rows = await sql`
      SELECT * FROM "User"
      WHERE REGEXP_REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(guardian_number, ''), '٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'), '[^0-9]', '', 'g') = ${norm}
         OR REGEXP_REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(student_number, ''), '٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'), '[^0-9]', '', 'g') = ${norm}
      LIMIT 1
    `;
    return (rows[0] as User) ?? null;
  };

  let user = await matchByDigits(digits);
  if (user) return user;
  if (digits.startsWith("20") && digits.length === 12) {
    user = await matchByDigits("0" + digits.slice(2));
    if (user) return user;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    user = await matchByDigits("20" + digits.slice(1));
    if (user) return user;
  }
  if (digits.length === 10) {
    user = await matchByDigits("0" + digits);
    if (user) return user;
  }
  return null;
}

export async function getUserById(id: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM "User" WHERE id = ${id} LIMIT 1`;
  return (rows[0] as User) ?? null;
}

/** جلسة واحدة نشطة لكل مستخدم — نستخدمها لمنع تسجيل الدخول من أكثر من جهاز */
export async function getCurrentSessionId(userId: string): Promise<string | null> {
  try {
    const rows = await sql`SELECT current_session_id FROM "User" WHERE id = ${userId} LIMIT 1`;
    const val = (rows[0] as { current_session_id?: string | null })?.current_session_id;
    return val ?? null;
  } catch {
    return null;
  }
}

export async function setCurrentSessionId(userId: string, sessionId: string): Promise<void> {
  await sql`UPDATE "User" SET current_session_id = ${sessionId} WHERE id = ${userId}`;
}

export async function clearCurrentSessionId(userId: string): Promise<void> {
  await sql`UPDATE "User" SET current_session_id = NULL WHERE id = ${userId}`;
}

export async function createUser(data: {
  email: string;
  password_hash: string;
  name: string;
  role?: UserRole;
  student_number?: string | null;
  guardian_number?: string | null;
}): Promise<User> {
  const id = generateId();
  await sql`
    INSERT INTO "User" (id, email, password_hash, name, role, student_number, guardian_number)
    VALUES (${id}, ${data.email}, ${data.password_hash}, ${data.name}, ${data.role ?? "STUDENT"}, ${data.student_number ?? null}, ${data.guardian_number ?? null})
  `;
  const u = await getUserById(id);
  if (!u) throw new Error("فشل إنشاء المستخدم");
  return u;
}

export async function updateUser(
  id: string,
  data: { name?: string; email?: string; role?: UserRole; balance?: string; password_hash?: string; student_number?: string | null; guardian_number?: string | null }
): Promise<void> {
  if (data.name !== undefined) await sql`UPDATE "User" SET name = ${data.name}, updated_at = NOW() WHERE id = ${id}`;
  if (data.email !== undefined) await sql`UPDATE "User" SET email = ${data.email}, updated_at = NOW() WHERE id = ${id}`;
  if (data.role !== undefined) await sql`UPDATE "User" SET role = ${data.role}, updated_at = NOW() WHERE id = ${id}`;
  if (data.balance !== undefined) await sql`UPDATE "User" SET balance = ${data.balance}, updated_at = NOW() WHERE id = ${id}`;
  if (data.password_hash !== undefined) await sql`UPDATE "User" SET password_hash = ${data.password_hash}, updated_at = NOW() WHERE id = ${id}`;
  if (data.student_number !== undefined) await sql`UPDATE "User" SET student_number = ${data.student_number}, updated_at = NOW() WHERE id = ${id}`;
  if (data.guardian_number !== undefined) await sql`UPDATE "User" SET guardian_number = ${data.guardian_number}, updated_at = NOW() WHERE id = ${id}`;
}

// ----- Category -----
export async function getCategories(): Promise<Category[]> {
  const rows = await sql`SELECT * FROM "Category" ORDER BY "order" ASC`;
  return rowsToCamel(rows as Record<string, unknown>[]) as Category[];
}

export async function createCategory(data: {
  name: string;
  name_ar?: string | null;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  order?: number;
}): Promise<Category> {
  const id = generateId();
  await sql`
    INSERT INTO "Category" (id, name, name_ar, slug, description, image_url, "order")
    VALUES (${id}, ${data.name}, ${data.name_ar ?? null}, ${data.slug}, ${data.description ?? null}, ${data.image_url ?? null}, ${data.order ?? 0})
  `;
  const rows = await sql`SELECT * FROM "Category" WHERE id = ${id} LIMIT 1`;
  return rowToCamel(rows[0] as Record<string, unknown>) as Category;
}

/** البحث عن قسم بالاسم (name أو name_ar) — للمطابقة عند كتابة اسم قسم جديد */
export async function getCategoryByName(name: string): Promise<Category | null> {
  const n = name.trim();
  if (!n) return null;
  const rows = await sql`
    SELECT * FROM "Category"
    WHERE LOWER(TRIM(name)) = LOWER(${n})
       OR (name_ar IS NOT NULL AND LOWER(TRIM(name_ar)) = LOWER(${n}))
    LIMIT 1
  `;
  return (rowToCamel(rows[0] as Record<string, unknown>) as Category) ?? null;
}

// ----- Review (تعليقات الطلاب) -----
export async function getReviews(): Promise<Review[]> {
  const rows = await sql`SELECT * FROM "Review" ORDER BY "order" ASC, created_at DESC`;
  return rowsToCamel(rows as Record<string, unknown>[]) as Review[];
}

export async function getReviewById(id: string): Promise<Review | null> {
  const rows = await sql`SELECT * FROM "Review" WHERE id = ${id} LIMIT 1`;
  return (rowToCamel(rows[0] as Record<string, unknown>) as Review) ?? null;
}

export async function createReview(data: {
  text: string;
  author_name: string;
  author_title?: string | null;
  avatar_letter?: string | null;
  order?: number;
}): Promise<Review> {
  const id = generateId();
  const rows = await sql`
    INSERT INTO "Review" (id, text, author_name, author_title, avatar_letter, "order")
    VALUES (${id}, ${data.text}, ${data.author_name}, ${data.author_title ?? null}, ${data.avatar_letter ?? null}, ${data.order ?? 0})
    RETURNING *
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("فشل إنشاء التعليق");
  return rowToCamel(row) as Review;
}

export async function updateReview(
  id: string,
  data: { text?: string; author_name?: string; author_title?: string | null; avatar_letter?: string | null; order?: number }
): Promise<void> {
  if (data.text !== undefined) await sql`UPDATE "Review" SET text = ${data.text}, updated_at = NOW() WHERE id = ${id}`;
  if (data.author_name !== undefined) await sql`UPDATE "Review" SET author_name = ${data.author_name}, updated_at = NOW() WHERE id = ${id}`;
  if (data.author_title !== undefined) await sql`UPDATE "Review" SET author_title = ${data.author_title}, updated_at = NOW() WHERE id = ${id}`;
  if (data.avatar_letter !== undefined) await sql`UPDATE "Review" SET avatar_letter = ${data.avatar_letter}, updated_at = NOW() WHERE id = ${id}`;
  if (data.order !== undefined) await sql`UPDATE "Review" SET "order" = ${data.order}, updated_at = NOW() WHERE id = ${id}`;
}

export async function deleteReview(id: string): Promise<void> {
  await sql`DELETE FROM "Review" WHERE id = ${id}`;
}

// ----- HomepageSetting (إعدادات الصفحة الرئيسية) -----
const HOMEPAGE_DEFAULTS: HomepageSetting = {
  teacherImageUrl: "/instructor.png",
  heroTitle: "أستاذ / عصام محي",
  heroSlogan: "ادرسها... يمكن تفهم المعلومة صح!",
  platformName: "منصة أستاذ عصام محي",
  whatsappUrl: "https://wa.me/201023005622",
  facebookUrl: "https://www.facebook.com/profile.php?id=61562686209159",
  pageTitle: "منصتي التعليمية | دورات وتعلم أونلاين",
  heroBgPreset: "navy",
  footerTitle: "منصتي التعليمية",
  footerTagline: "تعلم بأسلوب حديث ومنهجية واضحة",
  footerCopyright: "منصتي التعليمية. جميع الحقوق محفوظة.",
};

export async function getHomepageSettings(): Promise<HomepageSetting> {
  try {
    const rows = await sql`SELECT * FROM "HomepageSetting" WHERE id = 'default' LIMIT 1`;
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return HOMEPAGE_DEFAULTS;
    const c = rowToCamel(row) as Record<string, unknown>;
    return {
      teacherImageUrl: (c.teacherImageUrl as string) ?? HOMEPAGE_DEFAULTS.teacherImageUrl,
      heroTitle: (c.heroTitle as string) ?? HOMEPAGE_DEFAULTS.heroTitle,
      heroSlogan: (c.heroSlogan as string) ?? HOMEPAGE_DEFAULTS.heroSlogan,
      platformName: (c.platformName as string) ?? HOMEPAGE_DEFAULTS.platformName,
      /* لا نستخدم الافتراضي عند الحذف — لو القيمة null أو فارغة نرجع null حتى يختفي الزر */
      whatsappUrl: c.whatsappUrl != null && String(c.whatsappUrl).trim() !== "" ? String(c.whatsappUrl).trim() : null,
      facebookUrl: c.facebookUrl != null && String(c.facebookUrl).trim() !== "" ? String(c.facebookUrl).trim() : null,
      pageTitle: (c.pageTitle as string) ?? HOMEPAGE_DEFAULTS.pageTitle,
      heroBgPreset: (c.heroBgPreset as string) ?? HOMEPAGE_DEFAULTS.heroBgPreset,
      footerTitle: (c.footerTitle as string) ?? HOMEPAGE_DEFAULTS.footerTitle,
      footerTagline: (c.footerTagline as string) ?? HOMEPAGE_DEFAULTS.footerTagline,
      footerCopyright: (c.footerCopyright as string) ?? HOMEPAGE_DEFAULTS.footerCopyright,
    };
  } catch {
    return HOMEPAGE_DEFAULTS;
  }
}

export async function updateHomepageSettings(data: {
  teacher_image_url?: string | null;
  hero_title?: string | null;
  hero_slogan?: string | null;
  platform_name?: string | null;
  whatsapp_url?: string | null;
  facebook_url?: string | null;
  page_title?: string | null;
  hero_bg_preset?: string | null;
  footer_title?: string | null;
  footer_tagline?: string | null;
  footer_copyright?: string | null;
}): Promise<void> {
  if (data.teacher_image_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET teacher_image_url = ${data.teacher_image_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_title !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_title = ${data.hero_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_slogan !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_slogan = ${data.hero_slogan}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.platform_name !== undefined) {
    await sql`UPDATE "HomepageSetting" SET platform_name = ${data.platform_name}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.whatsapp_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET whatsapp_url = ${data.whatsapp_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.facebook_url !== undefined) {
    await sql`UPDATE "HomepageSetting" SET facebook_url = ${data.facebook_url}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.page_title !== undefined) {
    await sql`UPDATE "HomepageSetting" SET page_title = ${data.page_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.hero_bg_preset !== undefined) {
    await sql`UPDATE "HomepageSetting" SET hero_bg_preset = ${data.hero_bg_preset}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.footer_title !== undefined) {
    await sql`UPDATE "HomepageSetting" SET footer_title = ${data.footer_title}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.footer_tagline !== undefined) {
    await sql`UPDATE "HomepageSetting" SET footer_tagline = ${data.footer_tagline}, updated_at = NOW() WHERE id = 'default'`;
  }
  if (data.footer_copyright !== undefined) {
    await sql`UPDATE "HomepageSetting" SET footer_copyright = ${data.footer_copyright}, updated_at = NOW() WHERE id = 'default'`;
  }
}

export async function getCourseBySlug(slug: string): Promise<(Course & { category?: Category }) | null> {
  const rows = await sql`
    SELECT c.*, cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug
    FROM "Course" c
    LEFT JOIN "Category" cat ON c.category_id = cat.id
    WHERE c.slug = ${slug} AND c.is_published = true
    LIMIT 1
  `;
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  const category = r.cat_id
    ? rowToCamel({ id: r.cat_id, name: r.cat_name, name_ar: r.cat_name_ar, slug: r.cat_slug })
    : null;
  const { cat_id, cat_name, cat_name_ar, cat_slug, ...courseRow } = r;
  const base = rowToCamel(courseRow) ?? {};
  return { ...base, category } as unknown as Course & { category?: Category };
}

export async function getCourseById(id: string): Promise<Course | null> {
  const rows = await sql`SELECT * FROM "Course" WHERE id = ${id} LIMIT 1`;
  return rowToCamel(rows[0] as Record<string, unknown>) as Course | null;
}

export async function getCourseBySlugOrId(slugOrId: string): Promise<Course | null> {
  if (/^c[a-z0-9]{24}$/i.test(slugOrId)) {
    return getCourseById(slugOrId);
  }
  const rows = await sql`SELECT * FROM "Course" WHERE slug = ${slugOrId} AND is_published = true LIMIT 1`;
  return rowToCamel(rows[0] as Record<string, unknown>) as Course | null;
}

export async function getCoursesPublished(withCategory = true): Promise<(Course & { category?: Category })[]> {
  if (!withCategory) {
    const rows = await sql`SELECT * FROM "Course" WHERE is_published = true ORDER BY "order" ASC, created_at DESC`;
    return rowsToCamel(rows as Record<string, unknown>[]) as (Course & { category?: Category })[];
  }
  const rows = await sql`
    SELECT c.*, cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug
    FROM "Course" c
    LEFT JOIN "Category" cat ON c.category_id = cat.id
    WHERE c.is_published = true
    ORDER BY c."order" ASC, c.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const category = r.cat_id
      ? rowToCamel({ id: r.cat_id, name: r.cat_name, name_ar: r.cat_name_ar, slug: r.cat_slug })
      : null;
    const { cat_id, cat_name, cat_name_ar, cat_slug, ...rest } = r;
    const base = rowToCamel(rest) ?? {};
    return { ...base, category };
  }) as unknown as (Course & { category?: Category })[];
}

export async function getCoursesWithCounts(): Promise<
  Array<
    Record<string, unknown> & {
      lessonsCount: number;
      enrollmentsCount: number;
      category?: { id: string; name: string; nameAr?: string | null; slug: string } | null;
    }
  >
> {
  const rows = await sql`
    SELECT c.*,
      (SELECT COUNT(*)::int FROM "Lesson" WHERE course_id = c.id) as lessons_count,
      (SELECT COUNT(*)::int FROM "Enrollment" WHERE course_id = c.id) as enrollments_count,
      cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug, cat."order" as cat_order
    FROM "Course" c
    LEFT JOIN "Category" cat ON c.category_id = cat.id
    ORDER BY cat."order" ASC NULLS LAST, c."order" ASC, c.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const category =
      r.cat_id != null
        ? rowToCamel({ id: r.cat_id, name: r.cat_name, name_ar: r.cat_name_ar, slug: r.cat_slug })
        : null;
    const { cat_id, cat_name, cat_name_ar, cat_slug, cat_order, ...rest } = r;
    return {
      ...rowToCamel(rest),
      lessonsCount: Number((r as { lessons_count?: number }).lessons_count ?? 0),
      enrollmentsCount: Number((r as { enrollments_count?: number }).enrollments_count ?? 0),
      category: category as { id: string; name: string; nameAr?: string | null; slug: string } | null,
    };
  }) as Array<
    Record<string, unknown> & {
      lessonsCount: number;
      enrollmentsCount: number;
      category?: { id: string; name: string; nameAr?: string | null; slug: string } | null;
    }
  >;
}

export async function getCoursesAll(): Promise<(Course & { category?: Category })[]> {
  const rows = await sql`
    SELECT c.*, cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug
    FROM "Course" c
    LEFT JOIN "Category" cat ON c.category_id = cat.id
    ORDER BY c."order" ASC, c.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const category = r.cat_id
      ? rowToCamel({ id: r.cat_id, name: r.cat_name, name_ar: r.cat_name_ar, slug: r.cat_slug })
      : null;
    const { cat_id, cat_name, cat_name_ar, cat_slug, ...rest } = r;
    const base = rowToCamel(rest) ?? {};
    return { ...base, category };
  }) as unknown as (Course & { category?: Category })[];
}

export async function courseExistsBySlug(slug: string): Promise<boolean> {
  const rows = await sql`SELECT id FROM "Course" WHERE slug = ${slug} LIMIT 1`;
  return rows.length > 0;
}

export async function createCourse(data: {
  title: string;
  title_ar: string;
  slug: string;
  description: string;
  short_desc?: string | null;
  image_url?: string | null;
  price: number;
  is_published: boolean;
  created_by_id: string;
  max_quiz_attempts?: number | null;
  category_id?: string | null;
  accepts_homework?: boolean;
}): Promise<Course> {
  const id = generateId();
  const catId = data.category_id ?? null;
  const acceptsHomework = data.accepts_homework ?? false;
  let rows: Record<string, unknown>[];
  try {
    rows = await sql`
      INSERT INTO "Course" (id, title, title_ar, slug, description, short_desc, image_url, price, is_published, created_by_id, max_quiz_attempts, category_id, accepts_homework)
      VALUES (${id}, ${data.title}, ${data.title_ar}, ${data.slug}, ${data.description}, ${data.short_desc ?? null}, ${data.image_url ?? null}, ${data.price}, ${data.is_published}, ${data.created_by_id}, ${data.max_quiz_attempts ?? null}, ${catId}, ${acceptsHomework})
      RETURNING *
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("accepts_homework") || msg.includes("column") && msg.includes("does not exist")) {
      rows = await sql`
        INSERT INTO "Course" (id, title, title_ar, slug, description, short_desc, image_url, price, is_published, created_by_id, max_quiz_attempts, category_id)
        VALUES (${id}, ${data.title}, ${data.title_ar}, ${data.slug}, ${data.description}, ${data.short_desc ?? null}, ${data.image_url ?? null}, ${data.price}, ${data.is_published}, ${data.created_by_id}, ${data.max_quiz_attempts ?? null}, ${catId})
        RETURNING *
      `;
    } else if (msg.includes("max_quiz_attempts") || msg.includes("category_id")) {
      rows = await sql`
        INSERT INTO "Course" (id, title, title_ar, slug, description, short_desc, image_url, price, is_published, created_by_id, category_id)
        VALUES (${id}, ${data.title}, ${data.title_ar}, ${data.slug}, ${data.description}, ${data.short_desc ?? null}, ${data.image_url ?? null}, ${data.price}, ${data.is_published}, ${data.created_by_id}, ${catId})
        RETURNING *
      `;
    } else {
      throw err;
    }
  }
  const row = rows?.[0] as Record<string, unknown> | undefined;
  const c = row ? rowToCamel(row) as Course : null;
  if (!c) throw new Error("فشل إنشاء الدورة");
  return c;
}

export async function updateCourse(
  id: string,
  data: {
    title?: string;
    title_ar?: string;
    description?: string;
    short_desc?: string | null;
    image_url?: string | null;
    price?: number;
    is_published?: boolean;
    max_quiz_attempts?: number | null;
    category_id?: string | null;
    accepts_homework?: boolean;
  }
): Promise<void> {
  if (data.title !== undefined) await sql`UPDATE "Course" SET title = ${data.title}, updated_at = NOW() WHERE id = ${id}`;
  if (data.title_ar !== undefined) await sql`UPDATE "Course" SET title_ar = ${data.title_ar}, updated_at = NOW() WHERE id = ${id}`;
  if (data.description !== undefined) await sql`UPDATE "Course" SET description = ${data.description}, updated_at = NOW() WHERE id = ${id}`;
  if (data.short_desc !== undefined) await sql`UPDATE "Course" SET short_desc = ${data.short_desc}, updated_at = NOW() WHERE id = ${id}`;
  if (data.image_url !== undefined) await sql`UPDATE "Course" SET image_url = ${data.image_url}, updated_at = NOW() WHERE id = ${id}`;
  if (data.price !== undefined) await sql`UPDATE "Course" SET price = ${data.price}, updated_at = NOW() WHERE id = ${id}`;
  if (data.is_published !== undefined) await sql`UPDATE "Course" SET is_published = ${data.is_published}, updated_at = NOW() WHERE id = ${id}`;
  if (data.max_quiz_attempts !== undefined) await sql`UPDATE "Course" SET max_quiz_attempts = ${data.max_quiz_attempts}, updated_at = NOW() WHERE id = ${id}`;
  if (data.category_id !== undefined) await sql`UPDATE "Course" SET category_id = ${data.category_id}, updated_at = NOW() WHERE id = ${id}`;
  if (data.accepts_homework !== undefined) {
    try {
      await sql`UPDATE "Course" SET accepts_homework = ${data.accepts_homework}, updated_at = NOW() WHERE id = ${id}`;
    } catch {
      /* العمود قد يكون غير موجود قبل تشغيل scripts/add-homework.sql */
    }
  }
}

export async function deleteCourse(id: string): Promise<void> {
  await sql`DELETE FROM "Course" WHERE id = ${id}`;
}

// ----- Lesson -----
export async function getLessonsByCourseId(courseId: string): Promise<Lesson[]> {
  const rows = await sql`SELECT * FROM "Lesson" WHERE course_id = ${courseId} ORDER BY "order" ASC`;
  return rows as Lesson[];
}

export async function getLessonBySlug(courseId: string, lessonSlug: string): Promise<Lesson | null> {
  const rows = await sql`SELECT * FROM "Lesson" WHERE course_id = ${courseId} AND slug = ${lessonSlug} LIMIT 1`;
  return (rows[0] as Lesson) ?? null;
}

export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  const rows = await sql`SELECT * FROM "Lesson" WHERE id = ${lessonId} LIMIT 1`;
  return (rows[0] as Lesson) ?? null;
}

export async function createLesson(data: {
  course_id: string;
  title: string;
  title_ar?: string | null;
  slug: string;
  content?: string | null;
  video_url?: string | null;
  pdf_url?: string | null;
  order: number;
  accepts_homework?: boolean;
}): Promise<Lesson> {
  const id = generateId();
  const acceptsHomework = data.accepts_homework ?? false;
  try {
    await sql`
      INSERT INTO "Lesson" (id, course_id, title, title_ar, slug, content, video_url, pdf_url, "order", accepts_homework)
      VALUES (${id}, ${data.course_id}, ${data.title}, ${data.title_ar ?? null}, ${data.slug}, ${data.content ?? null}, ${data.video_url ?? null}, ${data.pdf_url ?? null}, ${data.order}, ${acceptsHomework})
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const columnMissing = msg.includes("accepts_homework") || (msg.includes("column") && msg.includes("does not exist"));
    if (columnMissing) {
      await sql`ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS accepts_homework BOOLEAN NOT NULL DEFAULT false`;
      await sql`
        INSERT INTO "Lesson" (id, course_id, title, title_ar, slug, content, video_url, pdf_url, "order", accepts_homework)
        VALUES (${id}, ${data.course_id}, ${data.title}, ${data.title_ar ?? null}, ${data.slug}, ${data.content ?? null}, ${data.video_url ?? null}, ${data.pdf_url ?? null}, ${data.order}, ${acceptsHomework})
      `;
    } else throw err;
  }
  const l = await getLessonById(id);
  if (!l) throw new Error("فشل إنشاء الحصة");
  return l;
}

export async function deleteLessonsByCourseId(courseId: string): Promise<void> {
  await sql`DELETE FROM "Lesson" WHERE course_id = ${courseId}`;
}

/** جلب كورس مع الحصص والاختبارات (عدد أسئلة كل اختبار) — للصفحة التفصيلية */
export async function getCourseWithContent(segment: string): Promise<{
  course: (Course & { category?: Record<string, unknown> }) | null;
  lessons: Record<string, unknown>[];
  quizzes: Array<Record<string, unknown> & { _count: { questions: number } }>;
} | null> {
  const isId = /^c[a-z0-9]{24}$/i.test(segment);
  let courseRow: Record<string, unknown> | null = null;
  if (isId) {
    const rows = await sql`
      SELECT c.*, cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug
      FROM "Course" c
      LEFT JOIN "Category" cat ON c.category_id = cat.id
      WHERE c.id = ${segment} AND c.is_published = true LIMIT 1
    `;
    const r = rows[0] as Record<string, unknown> | undefined;
    if (!r) return null;
    const { cat_id, cat_name, cat_name_ar, cat_slug, ...rest } = r;
    courseRow = { ...rowToCamel(rest), category: r.cat_id ? rowToCamel({ id: cat_id, name: cat_name, name_ar: cat_name_ar, slug: cat_slug }) : null };
  } else {
    const c = await getCourseBySlug(segment);
    if (!c) return null;
    courseRow = c as unknown as Record<string, unknown>;
  }
  const courseId = courseRow.id as string;
  const lessonRows = await sql`SELECT * FROM "Lesson" WHERE course_id = ${courseId} ORDER BY "order" ASC`;
  const quizRows = await sql`
    SELECT q.*, (SELECT COUNT(*)::int FROM "Question" WHERE quiz_id = q.id) as question_count
    FROM "Quiz" q WHERE q.course_id = ${courseId} ORDER BY q."order" ASC
  `;
  const lessons = rowsToCamel(lessonRows as Record<string, unknown>[]);
  const quizzes = (quizRows as Record<string, unknown>[]).map((q) => ({
    ...rowToCamel(q),
    _count: { questions: Number((q as { question_count?: number }).question_count ?? 0) },
  })) as Array<Record<string, unknown> & { _count: { questions: number } }>;

  return {
    course: courseRow as unknown as Course & { category?: Record<string, unknown> },
    lessons,
    quizzes,
  };
}

/** جلب دورة كاملة مع حصص واختبارات (أسئلة + خيارات) — لصفحة التعديل */
export async function getCourseForEdit(courseId: string): Promise<{
  course: Record<string, unknown> | null;
  lessons: Record<string, unknown>[];
  quizzes: Array<Record<string, unknown> & { questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }> }>;
} | null> {
  const courseRows = await sql`SELECT * FROM "Course" WHERE id = ${courseId} LIMIT 1`;
  const courseRow = courseRows[0] as Record<string, unknown> | undefined;
  if (!courseRow) return null;

  const lessonRows = await sql`SELECT * FROM "Lesson" WHERE course_id = ${courseId} ORDER BY "order" ASC`;
  const quizRows = await sql`SELECT * FROM "Quiz" WHERE course_id = ${courseId} ORDER BY "order" ASC`;
  const quizzes: Array<Record<string, unknown> & { questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }> }> = [];

  for (const q of quizRows as Record<string, unknown>[]) {
    const questionRows = await sql`SELECT * FROM "Question" WHERE quiz_id = ${q.id} ORDER BY "order" ASC`;
    const questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }> = [];
    for (const qu of questionRows as Record<string, unknown>[]) {
      const optRows = await sql`SELECT * FROM "QuestionOption" WHERE question_id = ${qu.id} ORDER BY id`;
      questions.push({ ...rowToCamel(qu)!, options: rowsToCamel(optRows as Record<string, unknown>[]) });
    }
    quizzes.push({ ...rowToCamel(q)!, questions });
  }

  return {
    course: rowToCamel(courseRow)!,
    lessons: rowsToCamel(lessonRows as Record<string, unknown>[]),
    quizzes,
  };
}

// ----- Quiz / Question / QuestionOption -----
export async function getQuizById(quizId: string): Promise<{
  quiz: Record<string, unknown>;
  course: Record<string, unknown>;
  questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }>;
} | null> {
  const quizRows = await sql`SELECT * FROM "Quiz" WHERE id = ${quizId} LIMIT 1`;
  const quizRow = quizRows[0] as Record<string, unknown> | undefined;
  if (!quizRow) return null;

  const courseId = quizRow.course_id as string;
  const courseRows = await sql`SELECT * FROM "Course" WHERE id = ${courseId} LIMIT 1`;
  const courseRow = courseRows[0] as Record<string, unknown> | undefined;
  if (!courseRow) return null;

  const questionRows = await sql`SELECT * FROM "Question" WHERE quiz_id = ${quizId} ORDER BY "order" ASC`;
  const questions: Array<Record<string, unknown> & { options: Record<string, unknown>[] }> = [];

  for (const q of questionRows as Record<string, unknown>[]) {
    const optRows = await sql`SELECT * FROM "QuestionOption" WHERE question_id = ${q.id} ORDER BY id`;
    questions.push({
      ...rowToCamel(q)!,
      options: rowsToCamel(optRows as Record<string, unknown>[]),
    } as Record<string, unknown> & { options: Record<string, unknown>[] });
  }

  return {
    quiz: rowToCamel(quizRow)!,
    course: rowToCamel(courseRow)!,
    questions,
  };
}

export async function createQuiz(data: { course_id: string; title: string; order: number }): Promise<Quiz> {
  const id = generateId();
  await sql`
    INSERT INTO "Quiz" (id, course_id, title, "order")
    VALUES (${id}, ${data.course_id}, ${data.title}, ${data.order})
  `;
  const rows = await sql`SELECT * FROM "Quiz" WHERE id = ${id} LIMIT 1`;
  const q = rows[0] as Quiz;
  if (!q) throw new Error("فشل إنشاء الاختبار");
  return q;
}

export async function createQuestion(data: {
  quiz_id: string;
  type: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE";
  question_text: string;
  order: number;
}): Promise<Question> {
  const id = generateId();
  await sql`
    INSERT INTO "Question" (id, quiz_id, type, question_text, "order")
    VALUES (${id}, ${data.quiz_id}, ${data.type}, ${data.question_text}, ${data.order})
  `;
  const rows = await sql`SELECT * FROM "Question" WHERE id = ${id} LIMIT 1`;
  const q = rows[0] as Question;
  if (!q) throw new Error("فشل إنشاء السؤال");
  return q;
}

export async function createQuestionOption(data: {
  question_id: string;
  text: string;
  is_correct: boolean;
}): Promise<QuestionOption> {
  const id = generateId();
  await sql`
    INSERT INTO "QuestionOption" (id, question_id, text, is_correct)
    VALUES (${id}, ${data.question_id}, ${data.text}, ${data.is_correct})
  `;
  const rows = await sql`SELECT * FROM "QuestionOption" WHERE id = ${id} LIMIT 1`;
  const o = rows[0] as QuestionOption;
  if (!o) throw new Error("فشل إنشاء الخيار");
  return o;
}

export async function deleteQuizzesByCourseId(courseId: string): Promise<void> {
  const quizzes = await sql`SELECT id FROM "Quiz" WHERE course_id = ${courseId}`;
  for (const q of quizzes as { id: string }[]) {
    const questions = await sql`SELECT id FROM "Question" WHERE quiz_id = ${q.id}`;
    for (const qu of questions as { id: string }[]) {
      await sql`DELETE FROM "QuestionOption" WHERE question_id = ${qu.id}`;
    }
    await sql`DELETE FROM "Question" WHERE quiz_id = ${q.id}`;
  }
  await sql`DELETE FROM "Quiz" WHERE course_id = ${courseId}`;
}

// ----- Enrollment -----
export async function getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  const rows = await sql`
    SELECT * FROM "Enrollment" WHERE user_id = ${userId} AND course_id = ${courseId} LIMIT 1
  `;
  return (rows[0] as Enrollment) ?? null;
}

export async function createEnrollment(userId: string, courseId: string): Promise<Enrollment> {
  const id = generateId();
  await sql`
    INSERT INTO "Enrollment" (id, user_id, course_id)
    VALUES (${id}, ${userId}, ${courseId})
  `;
  const rows = await sql`SELECT * FROM "Enrollment" WHERE id = ${id} LIMIT 1`;
  const e = rows[0] as Enrollment;
  if (!e) throw new Error("فشل إنشاء التسجيل");
  return e;
}

export async function deleteEnrollment(userId: string, courseId: string): Promise<void> {
  await sql`DELETE FROM "Enrollment" WHERE user_id = ${userId} AND course_id = ${courseId}`;
}

// ----- ActivationCode (أكواد التفعيل المجانية للدورات) -----
function generateCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function createActivationCodes(courseId: string, count: number): Promise<{ id: string; code: string }[]> {
  const created: { id: string; code: string }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    let code = generateCodeString();
    while (seen.has(code)) code = generateCodeString();
    seen.add(code);
    const id = generateId();
    await sql`
      INSERT INTO "ActivationCode" (id, course_id, code, used_at, used_by_user_id)
      VALUES (${id}, ${courseId}, ${code}, NULL, NULL)
    `;
    created.push({ id, code });
  }
  return created;
}

export type ActivationCodeWithCourse = ActivationCode & { course_title?: string; course_title_ar?: string };

export async function listActivationCodes(courseId?: string | null): Promise<ActivationCodeWithCourse[]> {
  const rows = courseId
    ? await sql`
        SELECT ac.*, c.title as course_title, c.title_ar as course_title_ar
        FROM "ActivationCode" ac
        JOIN "Course" c ON c.id = ac.course_id
        WHERE ac.course_id = ${courseId}
        ORDER BY ac.created_at DESC
      `
    : await sql`
        SELECT ac.*, c.title as course_title, c.title_ar as course_title_ar
        FROM "ActivationCode" ac
        JOIN "Course" c ON c.id = ac.course_id
        ORDER BY ac.created_at DESC
      `;
  return (rows as Record<string, unknown>[]).map((r) => rowToCamel(r) as ActivationCodeWithCourse);
}

export async function getActivationCodeByCode(code: string): Promise<(ActivationCode & { courseId: string }) | null> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const rows = await sql`
    SELECT * FROM "ActivationCode" WHERE UPPER(TRIM(code)) = ${trimmed} AND used_at IS NULL LIMIT 1
  `;
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return rowToCamel(r) as ActivationCode & { courseId: string };
}

export async function useActivationCode(codeId: string, userId: string): Promise<{ courseId: string } | null> {
  const rows = await sql`
    SELECT id, course_id FROM "ActivationCode" WHERE id = ${codeId} AND used_at IS NULL LIMIT 1
  `;
  const row = rows[0] as { id: string; course_id: string } | undefined;
  if (!row) return null;
  await sql`
    UPDATE "ActivationCode" SET used_at = NOW(), used_by_user_id = ${userId} WHERE id = ${codeId}
  `;
  await createEnrollment(userId, row.course_id);
  return { courseId: row.course_id };
}

export async function deleteActivationCode(id: string): Promise<void> {
  await sql`DELETE FROM "ActivationCode" WHERE id = ${id}`;
}

export async function deleteActivationCodes(ids: string[]): Promise<void> {
  for (const id of ids) await deleteActivationCode(id);
}

// ----- HomeworkSubmission (استلام واجبات الطلاب — مرتبط بحصة أو بالكورس) -----
export async function createHomeworkSubmission(data: {
  course_id: string;
  user_id: string;
  submission_type: "link" | "pdf" | "image";
  lesson_id?: string | null;
  link_url?: string | null;
  file_url?: string | null;
  file_name?: string | null;
}): Promise<HomeworkSubmission> {
  const id = generateId();
  const lessonId = data.lesson_id ?? null;
  try {
    await sql`
      INSERT INTO "HomeworkSubmission" (id, course_id, user_id, lesson_id, submission_type, link_url, file_url, file_name)
      VALUES (${id}, ${data.course_id}, ${data.user_id}, ${lessonId}, ${data.submission_type}, ${data.link_url ?? null}, ${data.file_url ?? null}, ${data.file_name ?? null})
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("lesson_id") || (msg.includes("column") && msg.includes("does not exist"))) {
      await sql`
        INSERT INTO "HomeworkSubmission" (id, course_id, user_id, submission_type, link_url, file_url, file_name)
        VALUES (${id}, ${data.course_id}, ${data.user_id}, ${data.submission_type}, ${data.link_url ?? null}, ${data.file_url ?? null}, ${data.file_name ?? null})
      `;
    } else throw err;
  }
  const rows = await sql`SELECT * FROM "HomeworkSubmission" WHERE id = ${id} LIMIT 1`;
  return rowToCamel(rows[0] as Record<string, unknown>) as HomeworkSubmission;
}

export type HomeworkSubmissionWithDetails = HomeworkSubmission & {
  course_title?: string;
  course_title_ar?: string;
  user_name?: string;
  lesson_title?: string;
  lesson_title_ar?: string;
};

export async function listHomeworkSubmissionsForAdmin(studentNameSearch?: string | null): Promise<HomeworkSubmissionWithDetails[]> {
  const search = studentNameSearch?.trim();
  const likePattern = search ? "%" + search + "%" : null;

  async function runWithLessonJoin(): Promise<Record<string, unknown>[]> {
    if (likePattern) {
      const rows = await sql`
        SELECT hs.*, c.title as course_title, c.title_ar as course_title_ar, u.name as user_name,
               l.title as lesson_title, l.title_ar as lesson_title_ar
        FROM "HomeworkSubmission" hs
        JOIN "Course" c ON c.id = hs.course_id
        JOIN "User" u ON u.id = hs.user_id
        LEFT JOIN "Lesson" l ON l.id = hs.lesson_id
        WHERE u.name ILIKE ${likePattern}
        ORDER BY hs.created_at DESC
      `;
      return rows as Record<string, unknown>[];
    }
    const rows = await sql`
      SELECT hs.*, c.title as course_title, c.title_ar as course_title_ar, u.name as user_name,
             l.title as lesson_title, l.title_ar as lesson_title_ar
      FROM "HomeworkSubmission" hs
      JOIN "Course" c ON c.id = hs.course_id
      JOIN "User" u ON u.id = hs.user_id
      LEFT JOIN "Lesson" l ON l.id = hs.lesson_id
      ORDER BY hs.created_at DESC
    `;
    return rows as Record<string, unknown>[];
  }

  async function runWithoutLessonJoin(): Promise<Record<string, unknown>[]> {
    if (likePattern) {
      const rows = await sql`
        SELECT hs.*, c.title as course_title, c.title_ar as course_title_ar, u.name as user_name
        FROM "HomeworkSubmission" hs
        JOIN "Course" c ON c.id = hs.course_id
        JOIN "User" u ON u.id = hs.user_id
        WHERE u.name ILIKE ${likePattern}
        ORDER BY hs.created_at DESC
      `;
      return rows as Record<string, unknown>[];
    }
    const rows = await sql`
      SELECT hs.*, c.title as course_title, c.title_ar as course_title_ar, u.name as user_name
      FROM "HomeworkSubmission" hs
      JOIN "Course" c ON c.id = hs.course_id
      JOIN "User" u ON u.id = hs.user_id
      ORDER BY hs.created_at DESC
    `;
    return rows as Record<string, unknown>[];
  }

  let rows: Record<string, unknown>[];
  try {
    rows = await runWithLessonJoin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("lesson_id") || (msg.includes("column") && msg.includes("does not exist"))) {
      await sql`ALTER TABLE "HomeworkSubmission" ADD COLUMN IF NOT EXISTS lesson_id TEXT REFERENCES "Lesson"(id) ON DELETE CASCADE`;
      try {
        rows = await runWithLessonJoin();
      } catch {
        rows = await runWithoutLessonJoin();
      }
    } else {
      rows = await runWithoutLessonJoin();
    }
  }
  return rows.map((r) => rowToCamel(r) as HomeworkSubmissionWithDetails);
}

export async function getHomeworkSubmissionsByCourseAndUser(courseId: string, userId: string): Promise<HomeworkSubmission[]> {
  const rows = await sql`
    SELECT * FROM "HomeworkSubmission" WHERE course_id = ${courseId} AND user_id = ${userId} ORDER BY created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => rowToCamel(r) as HomeworkSubmission);
}

export async function getHomeworkSubmissionsByLessonAndUser(lessonId: string, userId: string): Promise<HomeworkSubmission[]> {
  try {
    const rows = await sql`
      SELECT * FROM "HomeworkSubmission" WHERE lesson_id = ${lessonId} AND user_id = ${userId} ORDER BY created_at DESC
    `;
    return (rows as Record<string, unknown>[]).map((r) => rowToCamel(r) as HomeworkSubmission);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("lesson_id") || (msg.includes("column") && msg.includes("does not exist"))) {
      return [];
    }
    throw err;
  }
}

export async function deleteHomeworkSubmissionsByIds(ids: string[]): Promise<number> {
  const validIds = ids.filter((id) => id && String(id).trim());
  if (validIds.length === 0) return 0;
  for (const id of validIds) {
    await sql`DELETE FROM "HomeworkSubmission" WHERE id = ${id}`;
  }
  return validIds.length;
}

export async function deleteAllHomeworkSubmissions(): Promise<void> {
  await sql`DELETE FROM "HomeworkSubmission"`;
}

// ----- QuizAttempt (يتطلب تشغيل scripts/add-quiz-attempts.sql) -----
export async function countQuizAttemptsByUserAndCourse(userId: string, courseId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int as c FROM "QuizAttempt" qa
    JOIN "Quiz" q ON q.id = qa.quiz_id
    WHERE qa.user_id = ${userId} AND q.course_id = ${courseId}
  `;
  return Number((rows[0] as { c: number })?.c ?? 0);
}

export async function createQuizAttempt(
  userId: string,
  quizId: string,
  score: number,
  totalQuestions: number
): Promise<void> {
  const id = generateId();
  await sql`
    INSERT INTO "QuizAttempt" (id, user_id, quiz_id, score, total_questions, updated_at)
    VALUES (${id}, ${userId}, ${quizId}, ${score}, ${totalQuestions}, NOW())
  `;
}

export async function getQuizAttemptsByUserId(userId: string): Promise<
  Array<{ quizTitle: string; courseTitle: string; score: number; totalQuestions: number; createdAt: Date }>
> {
  const rows = await sql`
    SELECT q.title as quiz_title, c.title as course_title, qa.score, qa.total_questions, qa.created_at
    FROM "QuizAttempt" qa
    JOIN "Quiz" q ON q.id = qa.quiz_id
    JOIN "Course" c ON c.id = q.course_id
    WHERE qa.user_id = ${userId}
    ORDER BY qa.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    quizTitle: String(r.quiz_title ?? ""),
    courseTitle: String(r.course_title ?? ""),
    score: Number(r.score),
    totalQuestions: Number(r.total_questions),
    createdAt: r.created_at as Date,
  }));
}

export async function getAllQuizAttemptsForAdmin(): Promise<
  Array<{
    userId: string;
    userName: string;
    userEmail: string;
    quizId: string;
    quizTitle: string;
    courseId: string;
    courseTitle: string;
    score: number;
    totalQuestions: number;
    createdAt: Date;
  }>
> {
  const rows = await sql`
    SELECT u.id as user_id, u.name as user_name, u.email as user_email,
           qa.quiz_id, q.title as quiz_title, c.id as course_id, c.title as course_title,
           qa.score, qa.total_questions, qa.created_at
    FROM "QuizAttempt" qa
    JOIN "User" u ON u.id = qa.user_id
    JOIN "Quiz" q ON q.id = qa.quiz_id
    JOIN "Course" c ON c.id = q.course_id
    ORDER BY qa.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    userId: r.user_id as string,
    userName: r.user_name as string,
    userEmail: r.user_email as string,
    quizId: r.quiz_id as string,
    quizTitle: r.quiz_title as string,
    courseId: r.course_id as string,
    courseTitle: r.course_title as string,
    score: Number(r.score),
    totalQuestions: Number(r.total_questions),
    createdAt: r.created_at as Date,
  }));
}

/** إجمالي أرباح المنصة من مدفوعات الطلاب (رصيد مُخصوم عند التسجيل في كورسات مدفوعة) */
export async function getTotalPlatformEarnings(): Promise<number> {
  try {
    const rows = await sql`SELECT COALESCE(SUM(amount), 0)::float as total FROM "Payment"`;
    return Number((rows[0] as { total: number })?.total ?? 0);
  } catch {
    return 0;
  }
}

export async function createPayment(userId: string, courseId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const id = generateId();
  await sql`
    INSERT INTO "Payment" (id, user_id, course_id, amount)
    VALUES (${id}, ${userId}, ${courseId}, ${amount})
  `;
}

// ----- LiveStream -----
export async function getLiveStreamsByCourseId(courseId: string): Promise<LiveStream[]> {
  const rows = await sql`
    SELECT * FROM "LiveStream" WHERE course_id = ${courseId} ORDER BY "order" ASC, scheduled_at ASC
  `;
  return rowsToCamel(rows as Record<string, unknown>[]) as unknown as LiveStream[];
}

export async function getLiveStreamsAll(): Promise<(LiveStream & { course?: { id: string; title: string; slug: string } })[]> {
  const rows = await sql`
    SELECT ls.*, c.id as c_id, c.title as c_title, c.slug as c_slug
    FROM "LiveStream" ls
    LEFT JOIN "Course" c ON c.id = ls.course_id
    ORDER BY ls.scheduled_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const { c_id, c_title, c_slug, ...rest } = r;
    const base = rowToCamel(rest) ?? {};
    return { ...base, course: c_id ? { id: c_id, title: c_title, slug: c_slug } : undefined };
  }) as unknown as (LiveStream & { course?: { id: string; title: string; slug: string } })[];
}

export async function getLiveStreamById(id: string): Promise<LiveStream | null> {
  const rows = await sql`SELECT * FROM "LiveStream" WHERE id = ${id} LIMIT 1`;
  return rowToCamel(rows[0] as Record<string, unknown>) as LiveStream | null;
}

export async function createLiveStream(data: {
  course_id: string;
  title: string;
  title_ar?: string | null;
  provider: LiveStreamProvider;
  meeting_url: string;
  meeting_id?: string | null;
  meeting_password?: string | null;
  scheduled_at: Date;
  description?: string | null;
  order?: number;
}): Promise<LiveStream> {
  const id = generateId();
  await sql`
    INSERT INTO "LiveStream" (id, course_id, title, title_ar, provider, meeting_url, meeting_id, meeting_password, scheduled_at, description, "order")
    VALUES (${id}, ${data.course_id}, ${data.title}, ${data.title_ar ?? null}, ${data.provider}, ${data.meeting_url}, ${data.meeting_id ?? null}, ${data.meeting_password ?? null}, ${data.scheduled_at}, ${data.description ?? null}, ${data.order ?? 0})
  `;
  const ls = await getLiveStreamById(id);
  if (!ls) throw new Error("فشل إنشاء البث المباشر");
  return ls;
}

export async function updateLiveStream(
  id: string,
  data: {
    course_id?: string;
    title?: string;
    title_ar?: string | null;
    provider?: LiveStreamProvider;
    meeting_url?: string;
    meeting_id?: string | null;
    meeting_password?: string | null;
    scheduled_at?: Date;
    description?: string | null;
    order?: number;
  }
): Promise<void> {
  if (data.course_id !== undefined) await sql`UPDATE "LiveStream" SET course_id = ${data.course_id}, updated_at = NOW() WHERE id = ${id}`;
  if (data.title !== undefined) await sql`UPDATE "LiveStream" SET title = ${data.title}, updated_at = NOW() WHERE id = ${id}`;
  if (data.title_ar !== undefined) await sql`UPDATE "LiveStream" SET title_ar = ${data.title_ar}, updated_at = NOW() WHERE id = ${id}`;
  if (data.provider !== undefined) await sql`UPDATE "LiveStream" SET provider = ${data.provider}, updated_at = NOW() WHERE id = ${id}`;
  if (data.meeting_url !== undefined) await sql`UPDATE "LiveStream" SET meeting_url = ${data.meeting_url}, updated_at = NOW() WHERE id = ${id}`;
  if (data.meeting_id !== undefined) await sql`UPDATE "LiveStream" SET meeting_id = ${data.meeting_id}, updated_at = NOW() WHERE id = ${id}`;
  if (data.meeting_password !== undefined) await sql`UPDATE "LiveStream" SET meeting_password = ${data.meeting_password}, updated_at = NOW() WHERE id = ${id}`;
  if (data.scheduled_at !== undefined) await sql`UPDATE "LiveStream" SET scheduled_at = ${data.scheduled_at}, updated_at = NOW() WHERE id = ${id}`;
  if (data.description !== undefined) await sql`UPDATE "LiveStream" SET description = ${data.description}, updated_at = NOW() WHERE id = ${id}`;
  if (data.order !== undefined) await sql`UPDATE "LiveStream" SET "order" = ${data.order}, updated_at = NOW() WHERE id = ${id}`;
}

export async function deleteLiveStream(id: string): Promise<void> {
  await sql`DELETE FROM "LiveStream" WHERE id = ${id}`;
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const rows = await sql`SELECT * FROM "User" WHERE role = ${role} ORDER BY created_at DESC`;
  return rows as User[];
}

export async function getEnrollmentsWithCourseByUserId(userId: string): Promise<Array<Enrollment & { course: { id: string; title: string; titleAr: string | null; slug: string } }>> {
  const rows = await sql`
    SELECT e.*, c.id as c_id, c.title as c_title, c.title_ar as c_title_ar, c.slug as c_slug
    FROM "Enrollment" e
    JOIN "Course" c ON c.id = e.course_id
    WHERE e.user_id = ${userId}
    ORDER BY e.enrolled_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    course_id: r.course_id,
    enrolled_at: r.enrolled_at,
    course: {
      id: r.c_id,
      title: r.c_title,
      titleAr: r.c_title_ar,
      slug: r.c_slug,
    },
  })) as Array<Enrollment & { course: { id: string; title: string; titleAr: string | null; slug: string } }>;
}

/** دورات الطالب المسجّل فيها — بنفس شكل الكورسات في الصفحة الرئيسية (للعرض كبطاقات) */
export async function getEnrolledCoursesForUser(userId: string): Promise<(Course & { category?: Category })[]> {
  const rows = await sql`
    SELECT c.*, cat.id as cat_id, cat.name as cat_name, cat.name_ar as cat_name_ar, cat.slug as cat_slug
    FROM "Enrollment" e
    JOIN "Course" c ON c.id = e.course_id
    LEFT JOIN "Category" cat ON c.category_id = cat.id
    WHERE e.user_id = ${userId}
    ORDER BY e.enrolled_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => {
    const category = r.cat_id
      ? rowToCamel({ id: r.cat_id, name: r.cat_name, name_ar: r.cat_name_ar, slug: r.cat_slug })
      : null;
    const { cat_id, cat_name, cat_name_ar, cat_slug, ...rest } = r;
    const base = rowToCamel(rest) ?? {};
    return { ...base, category };
  }) as unknown as (Course & { category?: Category })[];
}

export async function getUserByEmailExcludingId(email: string, excludeUserId: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM "User" WHERE email = ${email} AND id != ${excludeUserId} LIMIT 1`;
  return (rows[0] as User) ?? null;
}

// ----- Counts -----
export async function countUsersByRole(role: UserRole): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int as c FROM "User" WHERE role = ${role}`;
  return Number((rows[0] as { c: number }).c ?? 0);
}

export async function countCourses(): Promise<number> {
  const rows = await sql`SELECT COUNT(*)::int as c FROM "Course"`;
  return Number((rows[0] as { c: number }).c ?? 0);
}
