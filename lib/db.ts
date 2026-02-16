import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import type { User, UserRole, Course, Category, Enrollment, Lesson, Quiz, Question, QuestionOption } from "./types";

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

export async function getUserById(id: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM "User" WHERE id = ${id} LIMIT 1`;
  return (rows[0] as User) ?? null;
}

export async function createUser(data: {
  email: string;
  password_hash: string;
  name: string;
  role?: UserRole;
}): Promise<User> {
  const id = generateId();
  await sql`
    INSERT INTO "User" (id, email, password_hash, name, role)
    VALUES (${id}, ${data.email}, ${data.password_hash}, ${data.name}, ${data.role ?? "STUDENT"})
  `;
  const u = await getUserById(id);
  if (!u) throw new Error("فشل إنشاء المستخدم");
  return u;
}

export async function updateUser(
  id: string,
  data: { name?: string; email?: string; role?: UserRole; balance?: string; password_hash?: string }
): Promise<void> {
  if (data.name !== undefined) await sql`UPDATE "User" SET name = ${data.name}, updated_at = NOW() WHERE id = ${id}`;
  if (data.email !== undefined) await sql`UPDATE "User" SET email = ${data.email}, updated_at = NOW() WHERE id = ${id}`;
  if (data.role !== undefined) await sql`UPDATE "User" SET role = ${data.role}, updated_at = NOW() WHERE id = ${id}`;
  if (data.balance !== undefined) await sql`UPDATE "User" SET balance = ${data.balance}, updated_at = NOW() WHERE id = ${id}`;
  if (data.password_hash !== undefined) await sql`UPDATE "User" SET password_hash = ${data.password_hash}, updated_at = NOW() WHERE id = ${id}`;
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

// ----- Course -----
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
  Array<Record<string, unknown> & { lessonsCount: number; enrollmentsCount: number }>
> {
  const rows = await sql`
    SELECT c.*,
      (SELECT COUNT(*)::int FROM "Lesson" WHERE course_id = c.id) as lessons_count,
      (SELECT COUNT(*)::int FROM "Enrollment" WHERE course_id = c.id) as enrollments_count
    FROM "Course" c
    ORDER BY c."order" ASC, c.created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    ...rowToCamel(r),
    lessonsCount: Number((r as { lessons_count?: number }).lessons_count ?? 0),
    enrollmentsCount: Number((r as { enrollments_count?: number }).enrollments_count ?? 0),
  })) as Array<Record<string, unknown> & { lessonsCount: number; enrollmentsCount: number }>;
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
}): Promise<Course> {
  const id = generateId();
  await sql`
    INSERT INTO "Course" (id, title, title_ar, slug, description, short_desc, image_url, price, is_published, created_by_id)
    VALUES (${id}, ${data.title}, ${data.title_ar}, ${data.slug}, ${data.description}, ${data.short_desc ?? null}, ${data.image_url ?? null}, ${data.price}, ${data.is_published}, ${data.created_by_id})
  `;
  const c = await getCourseById(id);
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
  }
): Promise<void> {
  if (data.title !== undefined) await sql`UPDATE "Course" SET title = ${data.title}, updated_at = NOW() WHERE id = ${id}`;
  if (data.title_ar !== undefined) await sql`UPDATE "Course" SET title_ar = ${data.title_ar}, updated_at = NOW() WHERE id = ${id}`;
  if (data.description !== undefined) await sql`UPDATE "Course" SET description = ${data.description}, updated_at = NOW() WHERE id = ${id}`;
  if (data.short_desc !== undefined) await sql`UPDATE "Course" SET short_desc = ${data.short_desc}, updated_at = NOW() WHERE id = ${id}`;
  if (data.image_url !== undefined) await sql`UPDATE "Course" SET image_url = ${data.image_url}, updated_at = NOW() WHERE id = ${id}`;
  if (data.price !== undefined) await sql`UPDATE "Course" SET price = ${data.price}, updated_at = NOW() WHERE id = ${id}`;
  if (data.is_published !== undefined) await sql`UPDATE "Course" SET is_published = ${data.is_published}, updated_at = NOW() WHERE id = ${id}`;
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
}): Promise<Lesson> {
  const id = generateId();
  await sql`
    INSERT INTO "Lesson" (id, course_id, title, title_ar, slug, content, video_url, pdf_url, "order")
    VALUES (${id}, ${data.course_id}, ${data.title}, ${data.title_ar ?? null}, ${data.slug}, ${data.content ?? null}, ${data.video_url ?? null}, ${data.pdf_url ?? null}, ${data.order})
  `;
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
