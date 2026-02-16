import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isStaff = session.user.role === "ADMIN" || session.user.role === "ASSISTANT_ADMIN";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          لوحة التحكم
        </h1>
        <nav className="flex flex-wrap items-center gap-2">
          {isStaff ? (
            <>
              <Link
                href="/dashboard/students"
                className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50"
              >
                الطلاب
              </Link>
              <Link
                href="/dashboard/courses"
                className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50"
              >
                إدارة الكورسات
              </Link>
              <Link
                href="/dashboard/live-streams"
                className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50"
              >
                البثوث المباشرة
              </Link>
              <Link
                href="/dashboard/courses/new"
                className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
              >
                إنشاء دورة
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/courses"
                className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50"
              >
                الكورسات المتاحة
              </Link>
              <Link
                href="/dashboard/profile"
                className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
              >
                تعديل بيانات الحساب
              </Link>
            </>
          )}
        </nav>
      </div>
      {children}
    </div>
  );
}
