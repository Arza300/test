import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer-black border-t border-neutral-800 bg-black mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-white">
              منصتي التعليمية
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              تعلم بأسلوب حديث ومنهجية واضحة
            </p>
          </div>
          <div className="flex gap-6">
            <Link
              href="/"
              className="text-sm text-neutral-400 transition hover:text-white"
            >
              الرئيسية
            </Link>
            <Link
              href="/courses"
              className="text-sm text-neutral-400 transition hover:text-white"
            >
              الدورات
            </Link>
          </div>
        </div>
        <p className="mt-8 border-t border-neutral-800 pt-8 text-center text-sm text-neutral-500">
          © {new Date().getFullYear()} منصتي التعليمية. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
