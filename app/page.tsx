import Link from "next/link";
import { unstable_noStore } from "next/cache";
import { getCoursesPublished, getCategories } from "@/lib/db";
import { CourseCard } from "@/components/CourseCard";

/** عدم تخزين الصفحة مؤقتاً — الكورسات الجديدة والمحذوفة تظهر فوراً */
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CourseWithCategory = Awaited<ReturnType<typeof getCoursesPublished>>[number];

export default async function HomePage() {
  unstable_noStore();
  let courses: CourseWithCategory[] = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    [courses, categories] = await Promise.all([getCoursesPublished(true), getCategories()]);
  } catch {
    // لا قاعدة بيانات أو غير متصلة - نعرض واجهة بدون دورات
  }

  /** تجميع الدورات حسب القسم: كل قسم له قائمة دورات، ودورات بدون قسم في قائمة منفصلة */
  const categoryIdToCourses = new Map<string, CourseWithCategory[]>();
  const uncategorized: CourseWithCategory[] = [];
  for (const c of courses) {
    const catId = (c as { category?: { id?: string } }).category?.id;
    if (catId) {
      if (!categoryIdToCourses.has(catId)) categoryIdToCourses.set(catId, []);
      categoryIdToCourses.get(catId)!.push(c);
    } else {
      uncategorized.push(c);
    }
  }

  /** أقسام لها دورات (بنفس ترتيب الأقسام في النظام) + قسم "دورات أخرى" إن وُجدت */
  const sections: { title: string; slug?: string; courses: CourseWithCategory[] }[] = [];
  for (const cat of categories) {
    const list = categoryIdToCourses.get(cat.id);
    if (list?.length) {
      sections.push({
        title: (cat as { nameAr?: string | null }).nameAr ?? cat.name,
        slug: cat.slug,
        courses: list,
      });
    }
  }
  if (uncategorized.length > 0) {
    sections.push({ title: "دورات أخرى", courses: uncategorized });
  }

  return (
    <div>
      {/* Hero – modern SaaS style: navy gradient, star dots, smooth bottom wave */}
      <section
        className="hero-saas relative min-h-screen w-full flex items-center justify-center overflow-hidden"
        aria-label="Hero"
      >
        {/* Dark navy gradient background */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            background: "linear-gradient(180deg, #14162E 0%, #1E2145 100%)",
          }}
        />

        {/* Subtle glowing dots (stars) – pure SVG */}
        <svg
          className="hero-stars absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="star-glow">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[
            [8, 12], [18, 8], [25, 22], [12, 35], [42, 15], [55, 28], [68, 10], [75, 40], [88, 18], [92, 55],
            [5, 55], [22, 62], [38, 72], [52, 65], [62, 78], [82, 68], [15, 82], [48, 88], [72, 92], [95, 75],
            [30, 45], [58, 52], [85, 42], [10, 68], [35, 28], [70, 58], [45, 38], [78, 25], [20, 50], [65, 35],
            [40, 58], [88, 48], [12, 42], [55, 72], [28, 18], [90, 62], [50, 12], [72, 82], [8, 78], [60, 45],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={`${x}%`}
              cy={`${y}%`}
              r={i % 3 === 0 ? 1.2 : 0.8}
              fill="rgba(255,255,255,0.35)"
              filter="url(#star-glow)"
              className="hero-star-dot"
              style={{ animationDelay: `${(i * 0.13) % 5}s` }}
            />
          ))}
        </svg>

        {/* Main content */}
        <div className="hero-saas-content relative z-10 mx-auto w-full max-w-5xl min-h-screen flex items-center justify-center px-4 py-16 sm:px-6 -mt-32">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-20">
            <div className="flex-1 text-center lg:text-right order-2 lg:order-1">
              <h1 className="text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
                أستاذ / عصام محي
              </h1>
              <p className="mt-6 text-2xl font-medium text-sky-200/90 sm:text-3xl">
                ادرسها... يمكن تفهم المعلومة صح!
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4 lg:justify-start">
                <Link
                  href="/courses"
                  className="group flex items-center gap-2 rounded-full bg-sky-500 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-sky-600 hover:shadow-xl"
                >
                  ابدأ الآن
                  <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
            <div className="flex-shrink-0 order-1 lg:order-2">
              <div className="relative">
                <img
                  src="/instructor.png"
                  alt="عصام محي"
                  className="h-60 w-60 rounded-2xl border-2 border-white/20 object-cover shadow-2xl sm:h-72 sm:w-72 lg:h-80 lg:w-80"
                />
                <img
                  src="/images/ruler.png"
                  alt=""
                  className="float-icon float-icon-1 absolute -left-10 top-0 h-12 w-12 object-contain drop-shadow-lg sm:-left-12 sm:top-2 sm:h-14 sm:w-14 lg:-left-14 lg:top-0 lg:h-16 lg:w-16"
                  aria-hidden
                />
                <img
                  src="/images/notebook.png"
                  alt=""
                  className="float-icon float-icon-2 absolute -right-10 bottom-4 h-12 w-12 object-contain drop-shadow-lg sm:-right-12 sm:bottom-6 sm:h-14 sm:w-14 lg:-right-14 lg:bottom-4 lg:h-16 lg:w-16"
                  aria-hidden
                />
                <img
                  src="/images/pencil.png"
                  alt=""
                  className="float-icon float-icon-3 absolute -bottom-4 left-2 h-11 w-11 object-contain drop-shadow-lg sm:left-4 sm:-bottom-5 sm:h-12 sm:w-12 lg:left-2 lg:-bottom-4 lg:h-14 lg:w-14"
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave – raised height; fill via Tailwind: white (light) / black (dark) */}
        <div className="absolute bottom-0 left-0 w-full leading-[0]">
          <svg
            className="w-full h-auto block"
            viewBox="0 0 1440 280"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0,120 C360,200 1080,40 1440,120 L1440,280 L0,280 Z"
              className="hero-wave-fill"
            />
          </svg>
        </div>
      </section>

      {/* أقسام الدورات — كل قسم له مكانه والدورات المرتبطة به فقط */}
      {sections.length > 0 ? (
        sections.map((section, idx) => (
          <section
            key={section.slug ?? `uncategorized-${idx}`}
            className="bg-white dark:bg-[var(--color-background)] mx-auto max-w-6xl px-4 py-16 sm:px-6"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-foreground)]">
                  {section.title}
                </h2>
                <p className="mt-1 text-[var(--color-muted)]">
                  {section.slug
                    ? `دورات قسم ${section.title}`
                    : "دورات بدون تصنيف"}
                </p>
              </div>
              <Link
                href={section.slug ? `/courses?category=${encodeURIComponent(section.slug)}` : "/courses"}
                className="text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                عرض الكل ←
              </Link>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {section.courses.slice(0, 6).map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            {section.courses.length > 6 && (
              <div className="mt-6 text-center">
                <Link
                  href={section.slug ? `/courses?category=${encodeURIComponent(section.slug)}` : "/courses"}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  عرض كل دورات القسم ({section.courses.length})
                </Link>
              </div>
            )}
          </section>
        ))
      ) : (
        <section className="bg-white dark:bg-[var(--color-background)] mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-[var(--color-foreground)]">
            دورات مميزة
          </h2>
          <p className="mt-1 text-[var(--color-muted)]">
            ابدأ بأحدث الدورات المنشورة
          </p>
          <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-12 text-center">
            <p className="text-[var(--color-muted)]">
              لا توجد دورات حالياً. تأكد من ضبط <code className="rounded bg-[var(--color-border)] px-1.5 py-0.5 text-sm">DATABASE_URL</code> في{" "}
              <code className="rounded bg-[var(--color-border)] px-1.5 py-0.5 text-sm">.env</code>
              ، وإذا كانت الجداول غير موجودة نفّذ سكربت <code className="rounded bg-[var(--color-border)] px-1.5 py-0.5 text-sm">scripts/init-neon-database.sql</code> في Neon (SQL Editor).
            </p>
          </div>
        </section>
      )}

      {/* تعليقات الطلاب — قسم منفصل بخلفية رمادية + صورة شخصية افتراضية */}
      <section className="reviews-section border-t border-[var(--color-border)] bg-[var(--color-reviews-bg)] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-[var(--color-foreground)]">
            ماذا يقول الطلاب
          </h2>
          <p className="mt-1 text-[var(--color-muted)]">
            تجارب حقيقية من طلاب المنصة
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-reviews-avatar)] text-lg font-semibold text-[var(--color-muted)]">
                أ
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[var(--color-foreground)]">
                  الدورة كانت واضحة جداً والشرح مريح، استفدت فعلاً وخلّيني أكمّل باقي الكورسات هنا.
                </p>
                <p className="mt-3 text-sm font-medium text-[var(--color-primary)]">أحمد م.</p>
                <p className="text-xs text-[var(--color-muted)]">طالب — دورة البرمجة</p>
              </div>
            </div>
            <div className="flex gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-reviews-avatar)] text-lg font-semibold text-[var(--color-muted)]">
                س
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[var(--color-foreground)]">
                  أول مرة أتابع شرح عربي يكون بهذا المستوى، المدرس فعلاً فاهم وبيوصّل الفكرة من غير تعقيد.
                </p>
                <p className="mt-3 text-sm font-medium text-[var(--color-primary)]">سارة ك.</p>
                <p className="text-xs text-[var(--color-muted)]">طالبة — دورة التصميم</p>
              </div>
            </div>
            <div className="flex gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-reviews-avatar)] text-lg font-semibold text-[var(--color-muted)]">
                ي
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[var(--color-foreground)]">
                  أنا كنت متوقّع إن الأونلاين ممل، لكن المنصة دي غيرت فكرتي والوقت بيعدي وأنا بفهم. أنصح أي حد يبدأ.
                </p>
                <p className="mt-3 text-sm font-medium text-[var(--color-primary)]">يوسف ح.</p>
                <p className="text-xs text-[var(--color-muted)]">طالب — دورة التطوير</p>
              </div>
            </div>
          </div>
        </div>
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

      {/* أزرار التواصل ثابتة — فيسبوك فوق واتساب */}
      <a
        href="https://www.facebook.com/profile.php?id=61562686209159"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-lg transition hover:scale-110 hover:shadow-xl"
        aria-label="صفحتنا على فيسبوك"
      >
        <svg className="h-9 w-9" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
      <a
        href="https://wa.me/201023005622"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-110 hover:shadow-xl"
        aria-label="تواصل عبر واتساب"
      >
        <svg className="h-9 w-9" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}
