"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CourseCard } from "@/components/CourseCard";
import type { Course } from "@/lib/types";
import type { Category } from "@/lib/types";

type CourseWithCategory = Course & { category?: Category };

function toCourseCardCourse(c: CourseWithCategory) {
  const cat = c.category as { name?: string; nameAr?: string | null } | undefined;
  return {
    id: c.id,
    title: c.title,
    titleAr: (c as Record<string, unknown>).titleAr ?? c.title_ar,
    slug: c.slug,
    shortDesc: (c as Record<string, unknown>).shortDesc ?? c.short_desc,
    duration: c.duration,
    level: c.level,
    imageUrl: (c as Record<string, unknown>).imageUrl ?? c.image_url,
    price: c.price,
    category: cat ? { name: cat.name ?? "", nameAr: cat.nameAr ?? cat.name } : undefined,
  };
}

export function MyCoursesSection({ courses }: { courses: CourseWithCategory[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => {
      const title = String((c as Record<string, unknown>).titleAr ?? c.title_ar ?? c.title ?? "").toLowerCase();
      const titleEn = String(c.title ?? "").toLowerCase();
      const slug = String(c.slug ?? "").toLowerCase();
      return title.includes(q) || titleEn.includes(q) || slug.includes(q);
    });
  }, [courses, search]);

  if (courses.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">دوراتي</h2>
        <p className="text-[var(--color-muted)]">
          لم تسجّل في أي دورة بعد.{" "}
          <Link href="/courses" className="font-medium text-[var(--color-primary)] hover:underline">
            تصفح الدورات
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">دوراتي</h2>

      <div className="mb-6">
        <label htmlFor="my-courses-search" className="sr-only">
          بحث في دوراتي
        </label>
        <input
          id="my-courses-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن دورة (بالاسم أو الرابط)..."
          className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-[var(--color-muted)]">لا توجد نتائج تطابق البحث.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={toCourseCardCourse(course)} />
          ))}
        </div>
      )}
    </div>
  );
}
