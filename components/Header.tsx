"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import type { UserRole } from "@/lib/types";
import { ThemeToggle } from "@/components/ThemeToggle";

function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status !== "authenticated" || !session?.user) return null;

  const roleLabel: Record<UserRole, string> = {
    ADMIN: "مدير",
    ASSISTANT_ADMIN: "مساعد مدير",
    STUDENT: "طالب",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/50"
      >
        <span className="max-w-[120px] truncate">{session.user.name}</span>
        <span className="text-[var(--color-muted)]">▼</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-hover)]">
          <div className="border-b border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)]">
            {roleLabel[session.user.role]}
          </div>
          <Link
            href="/dashboard"
            className="block px-3 py-2 text-sm hover:bg-[var(--color-border)]/50"
            onClick={() => setOpen(false)}
          >
            لوحة التحكم
          </Link>
          {(session.user.role === "ADMIN" || session.user.role === "ASSISTANT_ADMIN") && (
            <Link
              href="/dashboard/courses/new"
              className="block px-3 py-2 text-sm hover:bg-[var(--color-border)]/50"
              onClick={() => setOpen(false)}
            >
              إنشاء دورة
            </Link>
          )}
          <button
            type="button"
            className="w-full px-3 py-2 text-start text-sm text-red-600 hover:bg-[var(--color-border)]/50 dark:text-red-400"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: "/" });
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-xl font-bold text-[var(--color-foreground)] transition hover:opacity-90"
        >
          منصة أستاذ عصام محي
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6">
          <ThemeToggle />
          <Link
            href="/"
            className="text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
          >
            الرئيسية
          </Link>
          <Link
            href="/courses"
            className="text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
          >
            الدورات
          </Link>
          {status === "loading" ? (
            <span className="text-sm text-[var(--color-muted)]">...</span>
          ) : session ? (
            <UserMenu />
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
              >
                إنشاء حساب
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
