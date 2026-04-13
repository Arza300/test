"use client";

import Link from "next/link";

export function HomeStoreSection({
  productsCount,
}: {
  productsCount: number;
}) {
  return (
    <section className="home-teachers-hero-blend border-t border-[var(--color-border)] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
          <div className="bg-gradient-to-l from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-transparent p-8 sm:p-10">
            <h2 className="text-3xl font-bold text-[var(--color-foreground)]">متجر المنصة</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--color-muted)]">
              مرحبًا بك في متجر المنصة الذي يضم ملازم وكتب في غاية الأهمية. اختر ما يناسبك
              من المواد الرقمية التعليمية واستفد من محتوى مُنظّم يدعم رحلتك الدراسية.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/store"
                className="inline-flex items-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] hover:bg-[var(--color-primary-hover)]"
              >
                دخول متجر المنصة
              </Link>
              <span className="text-sm text-[var(--color-muted)]">عدد المنتجات المتاحة الآن: {productsCount}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
