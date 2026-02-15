"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CourseRow = {
  id: string;
  title: string;
  titleAr: string | null;
  slug: string;
  isPublished: boolean;
  price: number;
  imageUrl: string | null;
  lessonsCount: number;
  enrollmentsCount: number;
};

export function CoursesManageList({ courses }: { courses: CourseRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setDeletingId(id);
    const res = await fetch(`/api/dashboard/courses/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmDelete(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "فشل حذف الدورة");
      return;
    }
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <table className="w-full text-right">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/50">
            <th className="p-3 text-sm font-semibold text-[var(--color-foreground)]">الدورة</th>
            <th className="p-3 text-sm font-semibold text-[var(--color-foreground)]">الحصص</th>
            <th className="p-3 text-sm font-semibold text-[var(--color-foreground)]">المسجلون</th>
            <th className="p-3 text-sm font-semibold text-[var(--color-foreground)]">السعر</th>
            <th className="p-3 text-sm font-semibold text-[var(--color-foreground)]">الحالة</th>
            <th className="p-3 text-sm font-semibold text-[var(--color-foreground)]">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0">
              <td className="p-3">
                <div className="flex items-center gap-3">
                  {c.imageUrl && (
                    <img
                      src={c.imageUrl}
                      alt=""
                      className="h-12 w-20 rounded object-cover"
                    />
                  )}
                  <span className="font-medium text-[var(--color-foreground)]">
                    {c.titleAr ?? c.title}
                  </span>
                </div>
              </td>
              <td className="p-3 text-[var(--color-muted)]">{c.lessonsCount}</td>
              <td className="p-3 text-[var(--color-muted)]">{c.enrollmentsCount}</td>
              <td className="p-3">{c.price.toFixed(2)} ج.م</td>
              <td className="p-3">
                <span
                  className={
                    c.isPublished
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-muted)]"
                  }
                >
                  {c.isPublished ? "منشورة" : "غير منشورة"}
                </span>
              </td>
              <td className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/courses/${c.id}/edit`}
                    className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-background)]"
                  >
                    تعديل
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId !== null}
                    className={
                      confirmDelete === c.id
                        ? "rounded-[var(--radius-btn)] bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        : "rounded-[var(--radius-btn)] border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
                    }
                  >
                    {deletingId === c.id
                      ? "جاري الحذف..."
                      : confirmDelete === c.id
                        ? "اضغط مرة أخرى للحذف"
                        : "حذف"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {courses.length === 0 && (
        <p className="p-8 text-center text-[var(--color-muted)]">
          لا توجد دورات.{" "}
          <Link href="/dashboard/courses/new" className="text-[var(--color-primary)] hover:underline">
            إنشاء دورة جديدة
          </Link>
        </p>
      )}
    </div>
  );
}
