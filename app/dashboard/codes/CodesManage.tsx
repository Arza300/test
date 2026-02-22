"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

type CodeRow = {
  id: string;
  courseId: string;
  code: string;
  createdAt: string;
  usedAt: string | null;
  usedByUserId: string | null;
  courseTitle?: string;
  courseTitleAr?: string;
};

const NEW_DAYS = 7; // أكواد آخر 7 أيام = جديدة

function isNew(createdAt: string): boolean {
  const d = new Date(createdAt);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= NEW_DAYS;
}

export function CodesManage({ courseOptions }: { courseOptions: { id: string; title: string }[] }) {
  const router = useRouter();
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterCourseId, setFilterCourseId] = useState<string>("");
  const [searchCode, setSearchCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const [createCourseId, setCreateCourseId] = useState("");
  const [createCount, setCreateCount] = useState(5);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copySuccess, setCopySuccess] = useState(false);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const filteredCodes = useMemo(() => {
    const q = searchCode.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter((c) => (c.code ?? "").toLowerCase().includes(q));
  }, [codes, searchCode]);

  function toggleSelectAll() {
    if (selectedIds.size === filteredCodes.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredCodes.map((c) => c.id)));
  }

  function load() {
    setLoading(true);
    setError("");
    const url = filterCourseId
      ? `/api/dashboard/codes?courseId=${encodeURIComponent(filterCourseId)}`
      : "/api/dashboard/codes";
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("فشل جلب الأكواد");
        return res.json();
      })
      .then((data) => setCodes(Array.isArray(data) ? data : []))
      .catch((e) => setError(e instanceof Error ? e.message : "حدث خطأ"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [filterCourseId]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!createCourseId.trim()) {
      setError("اختر الدورة");
      return;
    }
    const count = Math.min(500, Math.max(1, createCount));
    setGenerating(true);
    try {
      const res = await fetch("/api/dashboard/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: createCourseId.trim(), count }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "فشل إنشاء الأكواد");
      setCreateCount(5);
      router.refresh();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل إنشاء الأكواد");
    } finally {
      setGenerating(false);
    }
  }

  function copyAllUnused() {
    const unused = filteredCodes.filter((c) => !c.usedAt);
    const text = unused.map((c) => c.code).join("\n");
    if (!text) {
      setError("لا توجد أكواد غير مستخدمة للنسخ");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => {
        setCopySuccess(true);
        setError("");
        setTimeout(() => setCopySuccess(false), 2000);
      },
      () => setError("فشل النسخ")
    );
  }

  function copyAll() {
    const text = filteredCodes.map((c) => c.code).join("\n");
    if (!text) {
      setError("لا توجد أكواد للنسخ");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => {
        setCopySuccess(true);
        setError("");
        setTimeout(() => setCopySuccess(false), 2000);
      },
      () => setError("فشل النسخ")
    );
  }

  function handleDelete(id: string) {
    if (confirmDeleteIds.has(id)) {
      setDeletingIds((prev) => new Set(prev).add(id));
      fetch("/api/dashboard/codes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      })
        .then((res) => res.json().catch(() => ({})))
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setConfirmDeleteIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          router.refresh();
          load();
        })
        .catch((e) => alert(e instanceof Error ? e.message : "فشل الحذف"))
        .finally(() => setDeletingIds((prev) => { const s = new Set(prev); s.delete(id); return s; }));
      return;
    }
    setConfirmDeleteIds((prev) => new Set(prev).add(id));
  }

  function handleBulkDelete(ids: string[]) {
    if (ids.length === 0) return;
    if (!confirm(`حذف ${ids.length} كود نهائياً؟`)) return;
    setDeletingIds((prev) => new Set([...prev, ...ids]));
    fetch("/api/dashboard/codes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setConfirmDeleteIds(new Set());
        router.refresh();
        load();
      })
      .catch((e) => alert(e instanceof Error ? e.message : "فشل الحذف"))
      .finally(() => setDeletingIds((prev) => { const s = new Set(prev); ids.forEach((id) => s.delete(id)); return s; }));
  }

  const unusedCodes = filteredCodes.filter((c) => !c.usedAt);
  const selectedForBulkDelete = selectedIds.size > 0 ? Array.from(selectedIds) : [];

  if (loading) {
    return (
      <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {copySuccess && (
        <div className="rounded-[var(--radius-btn)] bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
          تم نسخ الأكواد إلى الحافظة
        </div>
      )}

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">إنشاء أكواد جديدة</h3>
        <form onSubmit={handleGenerate} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">الدورة</label>
            <select
              value={createCourseId}
              onChange={(e) => setCreateCourseId(e.target.value)}
              className="mt-1 min-w-[200px] rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            >
              <option value="">— اختر الدورة —</option>
              {courseOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">عدد الأكواد (1–500)</label>
            <input
              type="number"
              min={1}
              max={500}
              value={createCount}
              onChange={(e) => setCreateCount(Number(e.target.value) || 1)}
              className="mt-1 w-24 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={generating}
            className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {generating ? "جاري الإنشاء..." : "إنشاء الأكواد"}
          </button>
        </form>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-background)]/50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
              قائمة الأكواد ({filteredCodes.length}{searchCode.trim() ? ` من ${codes.length}` : ""})
            </h3>
            <input
              type="search"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="بحث عن الكود..."
              className="min-w-[160px] max-w-[220px] rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <select
              value={filterCourseId}
              onChange={(e) => setFilterCourseId(e.target.value)}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
            >
              <option value="">كل الدورات</option>
              {courseOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={copyAllUnused}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-background)]"
            >
              نسخ الأكواد غير المستخدمة ({unusedCodes.length})
            </button>
            <button
              type="button"
              onClick={copyAll}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-background)]"
            >
              نسخ كل الأكواد
            </button>
            {selectedForBulkDelete.length > 0 && (
              <button
                type="button"
                onClick={() => handleBulkDelete(selectedForBulkDelete)}
                className="rounded-[var(--radius-btn)] bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                حذف المحدد ({selectedForBulkDelete.length})
              </button>
            )}
          </div>
        </div>
        {codes.length === 0 ? (
          <p className="p-8 text-center text-[var(--color-muted)]">لا توجد أكواد. أنشئ أكواداً من النموذج أعلاه.</p>
        ) : filteredCodes.length === 0 ? (
          <p className="p-8 text-center text-[var(--color-muted)]">لا توجد أكواد تطابق البحث.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/30">
                  <th className="p-2 text-right">
                    <input
                      type="checkbox"
                      checked={filteredCodes.length > 0 && selectedIds.size === filteredCodes.length}
                      onChange={toggleSelectAll}
                      className="rounded border-[var(--color-border)]"
                    />
                  </th>
                  <th className="p-2 text-right font-medium text-[var(--color-foreground)]">الدورة</th>
                  <th className="p-2 text-right font-medium text-[var(--color-foreground)]">الكود</th>
                  <th className="p-2 text-right font-medium text-[var(--color-foreground)]">التاريخ</th>
                  <th className="p-2 text-right font-medium text-[var(--color-foreground)]">الحالة</th>
                  <th className="p-2 text-right font-medium text-[var(--color-foreground)]">قديم/جديد</th>
                  <th className="p-2 text-right font-medium text-[var(--color-foreground)]">حذف</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-border)]">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="rounded border-[var(--color-border)]"
                      />
                    </td>
                    <td className="p-2 text-[var(--color-foreground)]">
                      {row.courseTitleAr ?? row.courseTitle ?? row.courseId}
                    </td>
                    <td className="p-2 font-mono text-[var(--color-foreground)]">{row.code}</td>
                    <td className="p-2 text-[var(--color-muted)]">
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString("ar-EG") : "—"}
                    </td>
                    <td className="p-2">
                      {row.usedAt ? (
                        <span className="text-amber-600 dark:text-amber-400">مستخدم</span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">غير مستخدم</span>
                      )}
                    </td>
                    <td className="p-2">
                      {isNew(row.createdAt) ? (
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900/40 dark:text-green-300">جديد</span>
                      ) : (
                        <span className="rounded bg-[var(--color-muted)]/20 px-1.5 py-0.5 text-xs text-[var(--color-muted)]">قديم</span>
                      )}
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingIds.has(row.id)}
                        className={
                          confirmDeleteIds.has(row.id)
                            ? "font-medium text-red-600 hover:underline"
                            : "text-red-600 hover:underline disabled:opacity-50"
                        }
                      >
                        {deletingIds.has(row.id) ? "جاري الحذف..." : confirmDeleteIds.has(row.id) ? "اضغط مرة أخرى للحذف" : "حذف"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
