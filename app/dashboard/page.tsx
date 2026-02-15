import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const isAssistant = session.user.role === "ASSISTANT_ADMIN";
  const isStudent = session.user.role === "STUDENT";

  if (isStudent) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        enrollments: { include: { course: true } },
      },
    });
    const balance = user?.balance ?? 0;

    return (
      <div className="space-y-8">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            مرحباً، {session.user.name}
          </h2>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[var(--color-muted)]">رصيدك الحالي:</span>
            <span className="text-2xl font-bold text-[var(--color-primary)]">
              {Number(balance).toFixed(2)} ج.م
            </span>
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
          {user?.enrollments && user.enrollments.length > 0 ? (
            <ul className="space-y-2">
              {user.enrollments.map((e) => (
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
  const studentsCount = await prisma.user.count({ where: { role: "STUDENT" } });
  const coursesCount = await prisma.course.count();

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Link
        href="/dashboard/students"
        className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-primary)]/30"
      >
        <h3 className="font-semibold text-[var(--color-foreground)]">الطلاب</h3>
        <p className="mt-1 text-3xl font-bold text-[var(--color-primary)]">
          {studentsCount}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">عرض القائمة وإدارة الطلاب</p>
      </Link>
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
      {isAdmin && (
        <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            كمدير، يمكنك إضافة رصيد لحسابات الطلاب من صفحة{" "}
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
