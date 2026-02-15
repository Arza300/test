import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-[var(--color-foreground)]">
              منصتي التعليمية
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              تعلم بأسلوب حديث ومنهجية واضحة
            </p>
          </div>
          <div className="flex gap-6">
            <Link
              href="/"
              className="text-sm text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
            >
              الرئيسية
            </Link>
            <Link
              href="/courses"
              className="text-sm text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
            >
              الدورات
            </Link>
          </div>
        </div>
        <p className="mt-8 border-t border-[var(--color-border)] pt-8 text-center text-sm text-[var(--color-muted)]">
          © {new Date().getFullYear()} منصتي التعليمية. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
