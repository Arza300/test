"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HomepageSetting } from "@/lib/types";

export function HomepageSettingsForm({ initialSettings }: { initialSettings: HomepageSetting }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    teacherImageUrl: initialSettings.teacherImageUrl ?? "",
    heroTitle: initialSettings.heroTitle ?? "",
    heroSlogan: initialSettings.heroSlogan ?? "",
    platformName: initialSettings.platformName ?? "",
    pageTitle: initialSettings.pageTitle ?? "",
    whatsappUrl: initialSettings.whatsappUrl ?? "",
    facebookUrl: initialSettings.facebookUrl ?? "",
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/settings/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherImageUrl: form.teacherImageUrl.trim() || null,
          heroTitle: form.heroTitle.trim() || null,
          heroSlogan: form.heroSlogan.trim() || null,
          platformName: form.platformName.trim() || null,
          pageTitle: form.pageTitle.trim() || null,
          whatsappUrl: form.whatsappUrl.trim() || null,
          facebookUrl: form.facebookUrl.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "فشل الحفظ");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6">
      {error && (
        <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">صورة المدرس</h3>
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          تظهر في الصفحة الرئيسية بجانب العنوان. يمكنك رفع صورة أو إدخال رابط صورة.
        </p>
        {form.teacherImageUrl ? (
          <div className="mb-3">
            <img
              src={form.teacherImageUrl}
              alt="معاينة"
              className="h-32 w-40 rounded-[var(--radius-btn)] border border-[var(--color-border)] object-cover"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50">
            {imageUploading ? "جاري الرفع..." : "اختر صورة للرفع"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={imageUploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setImageUploadError("");
                setImageUploading(true);
                try {
                  const fd = new FormData();
                  fd.set("file", f);
                  const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok && data.url) {
                    setForm((prev) => ({ ...prev, teacherImageUrl: data.url }));
                  } else {
                    setImageUploadError(data.error ?? "فشل الرفع");
                  }
                } catch {
                  setImageUploadError("فشل الاتصال");
                } finally {
                  setImageUploading(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>
        {imageUploadError && <p className="mt-1 text-sm text-red-600">{imageUploadError}</p>}
        <input
          type="text"
          value={form.teacherImageUrl}
          onChange={(e) => { setForm((f) => ({ ...f, teacherImageUrl: e.target.value })); setImageUploadError(""); }}
          placeholder="/instructor.png أو رابط صورة"
          className="mt-2 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">نصوص الصفحة الرئيسية</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">اسم المنصة (أعلى اليمين في الموقع)</label>
            <input
              type="text"
              value={form.platformName}
              onChange={(e) => setForm((f) => ({ ...f, platformName: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder="منصة أستاذ عصام محي"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">العنوان الرئيسي (في الهيرو)</label>
            <input
              type="text"
              value={form.heroTitle}
              onChange={(e) => setForm((f) => ({ ...f, heroTitle: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder="أستاذ / عصام محي"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">الشعار (تحت العنوان)</label>
            <input
              type="text"
              value={form.heroSlogan}
              onChange={(e) => setForm((f) => ({ ...f, heroSlogan: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder="ادرسها... يمكن تفهم المعلومة صح!"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">عنوان التبويب (المظهر في تاب المتصفح)</label>
            <input
              type="text"
              value={form.pageTitle}
              onChange={(e) => setForm((f) => ({ ...f, pageTitle: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder="منصتي التعليمية | دورات وتعلم أونلاين"
            />
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">روابط التواصل (الصفحة الرئيسية)</h3>
        <p className="mb-3 text-sm text-[var(--color-muted)]">
          روابط أزرار واتساب وفيسبوك الثابتة في أسفل يمين الصفحة الرئيسية.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">رابط واتساب</label>
            <input
              type="url"
              value={form.whatsappUrl}
              onChange={(e) => setForm((f) => ({ ...f, whatsappUrl: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder="https://wa.me/201023005622"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">رابط فيسبوك</label>
            <input
              type="url"
              value={form.facebookUrl}
              onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder="https://www.facebook.com/..."
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-6 py-2 font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </button>
    </form>
  );
}
