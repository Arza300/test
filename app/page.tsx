import Link from "next/link";
import { unstable_noStore } from "next/cache";
import { getCoursesPublished } from "@/lib/db";
import { CourseCard } from "@/components/CourseCard";

/** عدم تخزين الصفحة مؤقتاً — الكورسات الجديدة والمحذوفة تظهر فوراً */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  unstable_noStore();
  let courses: Awaited<ReturnType<typeof getCoursesPublished>> = [];
  try {
    courses = await getCoursesPublished(true);
    courses = courses.slice(0, 6);
  } catch {
    // لا قاعدة بيانات أو غير متصلة - نعرض واجهة بدون دورات
  }

  return (
    <div>
      {/* Hero - قسم المدرس يملأ الشاشة بالكامل */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-blue-50 via-blue-100/30 to-blue-50 dark:from-blue-950/20 dark:via-blue-900/10 dark:to-blue-950/20">
        {/* أيقونات خلفية للعلوم */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute left-8 top-24 text-5xl opacity-5 dark:opacity-3">🔬</div>
          <div className="absolute right-16 top-32 text-4xl opacity-5 dark:opacity-3">⚗️</div>
          <div className="absolute bottom-40 left-1/3 text-3xl opacity-5 dark:opacity-3">🧪</div>
          <div className="absolute top-1/2 left-20 text-6xl opacity-5 dark:opacity-3">📐</div>
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between">
            {/* النص - على اليسار (في RTL اليمين) */}
            <div className="flex-1 text-center lg:text-right order-2 lg:order-1">
              <h1 className="text-5xl font-bold leading-tight text-[var(--color-foreground)] sm:text-6xl lg:text-7xl">
                أستاذ / عصام محي
              </h1>
              <p className="mt-6 text-2xl font-medium text-[var(--color-primary)] sm:text-3xl">
                ادرسها... يمكن تفهم المعلومة صح!
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4 lg:justify-start">
                <Link
                  href="/courses"
                  className="group flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-[var(--color-primary-hover)] hover:shadow-xl"
                >
                  ابدأ الآن
                  <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>

            {/* صورة المدرس - على اليمين (في RTL اليسار) مع أيقونات عائمة */}
            <div className="flex-shrink-0 order-1 lg:order-2">
              <div className="relative">
                <img
                  src="/instructor.png"
                  alt="عصام محي"
                  className="h-60 w-60 border-4 border-black border-dotted object-cover shadow-xl sm:h-72 sm:w-72 lg:h-80 lg:w-80"
                />
                {/* أيقونات تطفو بجانب صورة المدرس */}
                <img
                  src="/images/ruler.png"
                  alt=""
                  className="float-icon float-icon-1 absolute -left-10 top-0 h-12 w-12 object-contain drop-shadow-md sm:-left-12 sm:top-2 sm:h-14 sm:w-14 lg:-left-14 lg:top-0 lg:h-16 lg:w-16"
                  aria-hidden
                />
                <img
                  src="/images/notebook.png"
                  alt=""
                  className="float-icon float-icon-2 absolute -right-10 bottom-4 h-12 w-12 object-contain drop-shadow-md sm:-right-12 sm:bottom-6 sm:h-14 sm:w-14 lg:-right-14 lg:bottom-4 lg:h-16 lg:w-16"
                  aria-hidden
                />
                <img
                  src="/images/pencil.png"
                  alt=""
                  className="float-icon float-icon-3 absolute -bottom-4 left-2 h-11 w-11 object-contain drop-shadow-md sm:left-4 sm:-bottom-5 sm:h-12 sm:w-12 lg:left-2 lg:-bottom-4 lg:h-14 lg:w-14"
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured courses */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-foreground)]">
              دورات مميزة
            </h2>
            <p className="mt-1 text-[var(--color-muted)]">
              ابدأ بأحدث الدورات المنشورة
            </p>
          </div>
          <Link
            href="/courses"
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            عرض الكل ←
          </Link>
        </div>

        {courses.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-12 text-center">
            <p className="text-[var(--color-muted)]">
              لا توجد دورات حالياً. تأكد من ضبط <code className="rounded bg-[var(--color-border)] px-1.5 py-0.5 text-sm">DATABASE_URL</code> في{" "}
              <code className="rounded bg-[var(--color-border)] px-1.5 py-0.5 text-sm">.env</code>
              ، وإذا كانت الجداول غير موجودة نفّذ سكربت <code className="rounded bg-[var(--color-border)] px-1.5 py-0.5 text-sm">scripts/init-neon-database.sql</code> في Neon (SQL Editor).
            </p>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-[var(--radius-card)] bg-[var(--color-primary)]/10 p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold text-[var(--color-foreground)]">
              جاهز للانطلاق؟
            </h2>
            <p className="mt-2 text-[var(--color-muted)]">
              اختر دورة وابدأ رحلة التعلم اليوم.
            </p>
            <Link
              href="/courses"
              className="mt-6 inline-block rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-6 py-3 font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              ابدأ الآن
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
