import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getUserById, getEnrollmentsWithCourseByUserId, countUsersByRole, countCourses, getAllQuizAttemptsForAdmin, getTotalPlatformEarnings } from "@/lib/db";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const isAssistant = session.user.role === "ASSISTANT_ADMIN";
  const isStudent = session.user.role === "STUDENT";

  if (isStudent) {
    const user = await getUserById(session.user.id);
    const enrollments = user ? await getEnrollmentsWithCourseByUserId(session.user.id) : [];
    const balance = user ? Number(user.balance) : 0;

    return (
      <div className="space-y-8">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            مرحباً، {session.user.name}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[var(--color-muted)]">رصيدك الحالي:</span>
              <span className="text-2xl font-bold text-[var(--color-primary)]">
                {Number(balance).toFixed(2)} ج.م
              </span>
            </div>
            <Link
              href="/dashboard/add-balance"
              className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              إضافة رصيد
            </Link>
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-foreground)]">
            الكورسات المتاحة
          </h2>
          <p className="mb-4 text-sm text-[var(--color-muted)]">
            تصفح جميع الدورات وسجّل في ما يناسبك
          </p>
          <Link
            href="/courses"
            className="inline-flex rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            عرض الكورسات
          </Link>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
            دوراتي
          </h2>
          {enrollments.length > 0 ? (
            <ul className="space-y-2">
              {enrollments.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/courses/${e.course.slug}`}
                    className="block rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 transition hover:border-[var(--color-primary)]/30"
                  >
                    {e.course.titleAr ?? e.course.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--color-muted)]">
              لم تسجّل في أي دورة بعد.{" "}
              <Link href="/courses" className="text-[var(--color-primary)] font-medium hover:underline">
                تصفح الدورات
              </Link>
            </p>
          )}
        </div>
      </div>
    );
  }

  // أدمن أو مساعد أدمن
  const [studentsCount, coursesCount, quizAttempts, totalEarnings] = await Promise.all([
    countUsersByRole("STUDENT"),
    countCourses(),
    getAllQuizAttemptsForAdmin().catch(() => []),
    getTotalPlatformEarnings(),
  ]);

  return (
    <div className="space-y-8">
      {/* الصف الأول: الطلاب | إحصائيات الطلاب */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href="/dashboard/students"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-primary)]/30"
        >
          <h3 className="font-semibold text-[var(--color-foreground)]">{isAdmin ? "الطلاب والحسابات" : "الطلاب"}</h3>
          <p className="mt-1 text-3xl font-bold text-[var(--color-primary)]">
            {studentsCount}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">إدارة الطلاب، تعديل الحسابات، إضافة الأرصدة</p>
        </Link>
        <Link
          href="/dashboard/statistics"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-primary)]/30"
        >
          <h3 className="font-semibold text-[var(--color-foreground)]">إحصائيات الطلاب</h3>
          <div className="mt-3 flex flex-wrap gap-4">
            <span className="text-2xl font-bold text-[var(--color-primary)]">{studentsCount}</span>
            <span className="text-sm text-[var(--color-muted)]">طالب</span>
            <span className="text-[var(--color-muted)]">·</span>
            <span className="text-2xl font-bold text-[var(--color-primary)]">{quizAttempts.length}</span>
            <span className="text-sm text-[var(--color-muted)]">محاولة اختبار</span>
            <span className="text-[var(--color-muted)]">·</span>
            <span className="text-2xl font-bold text-[var(--color-primary)]">{totalEarnings.toFixed(2)}</span>
            <span className="text-sm text-[var(--color-muted)]">ج.م أرباح</span>
          </div>
          <p className="mt-2 text-sm text-[var(--color-muted)]">عرض التفاصيل والدرجات وإجمالي الأرباح</p>
        </Link>
      </div>

      {/* إدارة الكورسات | البثوث المباشرة — للأدمن فقط */}
      {isAdmin && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            href="/dashboard/courses"
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-primary)]/30"
          >
            <h3 className="font-semibold text-[var(--color-foreground)]">إدارة الكورسات</h3>
            <p className="mt-1 text-3xl font-bold text-[var(--color-primary)]">
              {coursesCount}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">تعديل أو حذف الدورات · إنشاء دورة جديدة</p>
          </Link>
          <Link
            href="/dashboard/settings/homepage"
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-primary)]/30"
          >
            <h3 className="font-semibold text-[var(--color-foreground)]">إعدادات الصفحة الرئيسية</h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">صورة المدرس واسم المنصة والعنوان والشعار</p>
          </Link>
          <Link
            href="/dashboard/reviews"
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-primary)]/30"
          >
            <h3 className="font-semibold text-[var(--color-foreground)]">تعليقات الطلاب</h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">إدارة تعليقات الطلاب المعروضة في الصفحة الرئيسية (إضافة / تعديل / حذف)</p>
          </Link>
          <Link
            href="/dashboard/live-streams"
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-primary)]/30"
          >
            <h3 className="font-semibold text-[var(--color-foreground)]">البثوث المباشرة</h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">إضافة بث من خلال Zoom أو Google Meet وربطه بكورس مرفوع مسبقاً في المنصة</p>
          </Link>
        </div>
      )}

      {(isAdmin || isAssistant) && (
        <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            يمكنك إضافة رصيد لحسابات الطلاب وتعديل أسمائهم وكلمات المرور من صفحة{" "}
            <Link href="/dashboard/students" className="font-medium underline">
              الطلاب
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
