"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function EnrollButton({
  courseId,
  coursePrice,
  userBalance,
}: {
  courseId: string;
  coursePrice: number;
  userBalance: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const hasEnoughBalance = coursePrice === 0 || userBalance >= coursePrice;

  async function handleClick() {
    if (!hasEnoughBalance) {
      setError(`رصيدك غير كافٍ. سعر الدورة: ${coursePrice.toFixed(2)} ج.م، رصيدك: ${userBalance.toFixed(2)} ج.م`);
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetch(`/api/enroll?courseId=${encodeURIComponent(courseId)}`, {
      method: "POST",
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "فشل التسجيل في الدورة");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-6">
      {coursePrice > 0 && (
        <div className="mb-4 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-muted)]">سعر الدورة:</span>
            <span className="text-lg font-semibold text-[var(--color-foreground)]">
              {coursePrice.toFixed(2)} ج.م
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-[var(--color-muted)]">رصيدك الحالي:</span>
            <span className={`text-lg font-semibold ${hasEnoughBalance ? "text-[var(--color-success)]" : "text-red-600"}`}>
              {userBalance.toFixed(2)} ج.م
            </span>
          </div>
          {!hasEnoughBalance && (
            <p className="mt-2 text-sm text-red-600">
              تحتاج {((coursePrice - userBalance).toFixed(2))} ج.م إضافية.{" "}
              <Link href="/dashboard" className="font-medium underline">شحن الرصيد</Link>
            </p>
          )}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-[var(--radius-btn)] bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !hasEnoughBalance}
        className="w-full rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-6 py-3 font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? "جاري التسجيل..."
          : coursePrice > 0
          ? `شراء الدورة (${coursePrice.toFixed(2)} ج.م)`
          : "التسجيل في الدورة (مجاناً)"}
      </button>
    </div>
  );
}
