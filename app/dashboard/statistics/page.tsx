import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import {
  getUsersByRole,
  getEnrollmentsWithCourseByUserId,
  getAllQuizAttemptsForAdmin,
  getTotalPlatformEarnings,
} from "@/lib/db";

export default async function StatisticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN") {
    redirect("/dashboard");
  }

  const [students, attempts, totalEarnings] = await Promise.all([
    getUsersByRole("STUDENT"),
    getAllQuizAttemptsForAdmin().catch(() => []),
    getTotalPlatformEarnings(),
  ]);

  const enrollmentsByUser = await Promise.all(
    students.map((s) => getEnrollmentsWithCourseByUserId(s.id))
  );

  const formatDate = (d: Date | string) =>
    new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" }).format(
      typeof d === "string" ? new Date(d) : d
    );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--color-foreground)]">
          إحصائيات الطلاب
        </h2>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          ← لوحة التحكم
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm text-[var(--color-muted)]">عدد الطلاب</p>
          <p className="text-2xl font-bold text-[var(--color-foreground)]">{students.length}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm text-[var(--color-muted)]">إجمالي التسجيلات في الكورسات</p>
          <p className="text-2xl font-bold text-[var(--color-foreground)]">
            {enrollmentsByUser.reduce((sum, e) => sum + e.length, 0)}
          </p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm text-[var(--color-muted)]">محاولات الاختبارات</p>
          <p className="text-2xl font-bold text-[var(--color-foreground)]">{attempts.length}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-light)]/20 p-4">
          <p className="text-sm text-[var(--color-muted)]">إجمالي أرباح المنصة</p>
          <p className="text-2xl font-bold text-[var(--color-primary)]">{totalEarnings.toFixed(2)} ج.م</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">من رصيد مدفوع من الطلاب للتسجيل في الكورسات</p>
        </div>
      </div>

      <section className="mb-8 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
          درجات الاختبارات
        </h3>
        {attempts.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">لا توجد محاولات مسجّلة حتى الآن.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="pb-2 text-right font-medium text-[var(--color-foreground)]">الطالب</th>
                  <th className="pb-2 text-right font-medium text-[var(--color-foreground)]">البريد</th>
                  <th className="pb-2 text-right font-medium text-[var(--color-foreground)]">الكورس</th>
                  <th className="pb-2 text-right font-medium text-[var(--color-foreground)]">الاختبار</th>
                  <th className="pb-2 text-right font-medium text-[var(--color-foreground)]">النتيجة</th>
                  <th className="pb-2 text-right font-medium text-[var(--color-foreground)]">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={`${a.userId}-${a.quizId}-${a.createdAt}`} className="border-b border-[var(--color-border)]/50">
                    <td className="py-2 text-[var(--color-foreground)]">{a.userName}</td>
                    <td className="py-2 text-[var(--color-muted)]">{a.userEmail}</td>
                    <td className="py-2 text-[var(--color-foreground)]">{a.courseTitle}</td>
                    <td className="py-2 text-[var(--color-foreground)]">{a.quizTitle}</td>
                    <td className="py-2 text-[var(--color-foreground)]">
                      {a.score} / {a.totalQuestions}
                    </td>
                    <td className="py-2 text-[var(--color-muted)]">{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
          الطلاب والتسجيلات
        </h3>
        {students.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">لا يوجد طلاب مسجّلون.</p>
        ) : (
          <ul className="space-y-4">
            {students.map((s, i) => {
              const enrollments = enrollmentsByUser[i] ?? [];
              const userAttempts = attempts.filter((a) => a.userId === s.id);
              return (
                <li
                  key={s.id}
                  className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-[var(--color-foreground)]">{s.name}</p>
                      <p className="text-sm text-[var(--color-muted)]">{s.email}</p>
                    </div>
                    <div className="flex gap-3 text-sm text-[var(--color-muted)]">
                      <span>مسجّل في {enrollments.length} كورس</span>
                      <span>محاولات اختبارات: {userAttempts.length}</span>
                    </div>
                  </div>
                  {enrollments.length > 0 && (
                    <p className="mt-2 text-sm text-[var(--color-foreground)]">
                      الكورسات: {enrollments.map((e) => e.course.titleAr ?? e.course.title).join("، ")}
                    </p>
                  )}
                  {userAttempts.length > 0 && (
                    <div className="mt-2 text-xs text-[var(--color-muted)]">
                      آخر النتائج:{" "}
                      {userAttempts.slice(0, 3).map((a) => `${a.quizTitle} (${a.score}/${a.totalQuestions})`).join(" — ")}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
