"use client";

import { useMemo, useState } from "react";
import { TeacherPublicCard, type TeacherCardCourse } from "@/components/TeacherPublicCard";

export type TeacherPublic = {
  id: string;
  name: string;
  teacherSubject: string | null;
  teacherAvatarUrl: string | null;
  courses: TeacherCardCourse[];
};

function normalizeSearch(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function TeachersBrowseClient({ initialTeachers }: { initialTeachers: TeacherPublic[] }) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    if (!q) return initialTeachers;
    return initialTeachers.filter((t) => {
      const name = (t.name ?? "").toLowerCase();
      const sub = (t.teacherSubject ?? "").toLowerCase();
      const inCourse = (t.courses ?? []).some((c) => (c.title ?? "").toLowerCase().includes(q));
      return name.includes(q) || sub.includes(q) || inCourse;
    });
  }, [initialTeachers, searchQuery]);

  const visibleTeachers = useMemo(() => {
    const n = expanded ? filtered.length : Math.min(6, filtered.length);
    return filtered.slice(0, n);
  }, [filtered, expanded]);

  return (
    <div className="min-h-[60vh] py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl font-bold leading-tight text-[var(--color-primary)] sm:text-5xl">
            اختر المدرسين
          </h1>
          <svg
            className="mt-3 h-8 w-[17.5rem] text-[var(--color-primary)] sm:h-9 sm:w-[21rem] md:w-[26rem]"
            viewBox="0 0 200 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M4 20 Q 100 3 196 20"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-muted)]">
            تصفح مدرسي المنصة وابحث بالاسم أو التخصص، ثم انتقل إلى دورات كل مدرس من صفحة الدورات.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-xl">
          <label htmlFor="teachers-search" className="sr-only">
            بحث عن مدرس
          </label>
          <input
            id="teachers-search"
            type="search"
            dir="rtl"
            autoComplete="off"
            placeholder="ابحث باسم المدرس أو المادة…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setExpanded(false);
            }}
            className="w-full rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-foreground)] shadow-[var(--shadow-card)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
          />
        </div>

        {initialTeachers.length === 0 ? (
          <p className="mt-16 text-center text-[var(--color-muted)]">
            لا يوجد مدرسون على المنصة حتى الآن. يمكن للمسؤول إضافة حسابات مدرسين من لوحة التحكم.
          </p>
        ) : filtered.length === 0 ? (
          <p className="mt-16 text-center text-[var(--color-muted)]">
            لا توجد نتائج تطابق بحثك. جرّب كلمات أخرى أو امسح حقل البحث.
          </p>
        ) : (
          <>
            <div className="mt-10 grid justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleTeachers.map((t) => (
                <TeacherPublicCard
                  key={t.id}
                  teacherId={t.id}
                  name={t.name}
                  teacherSubject={t.teacherSubject}
                  teacherAvatarUrl={t.teacherAvatarUrl}
                  courses={t.courses}
                  titleTag="h2"
                />
              ))}
            </div>
            {filtered.length > 6 ? (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className="rounded-lg bg-red-600 px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-red-700"
                >
                  {expanded ? "عرض أقل" : "عرض المزيد من المدرسين"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
