"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TeacherPublicCard, type TeacherCardCourse } from "@/components/TeacherPublicCard";

export type HomeTeacher = {
  id: string;
  name: string;
  teacherSubject: string | null;
  teacherAvatarUrl: string | null;
  createdAt: string;
  courses: TeacherCardCourse[];
};

/** قسم الصفحة الرئيسية «اختر المدرسين» — يظهر فقط عند تفعيل الميزة من السيرفر */
export function HomeTeachersSection({
  enabled,
  initialTeachers,
}: {
  enabled: boolean;
  initialTeachers: HomeTeacher[];
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [initialTeachers]);

  const sorted = useMemo(() => {
    const list = [...initialTeachers];
    list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
    return list;
  }, [initialTeachers]);

  const visible = useMemo(() => {
    const n = expanded ? sorted.length : Math.min(6, sorted.length);
    return sorted.slice(0, n);
  }, [sorted, expanded]);

  if (!enabled) return null;

  return (
    <section
      className="home-teachers-hero-blend py-14"
      dir="rtl"
      aria-labelledby="home-teachers-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <h2
            id="home-teachers-heading"
            className="text-4xl font-bold leading-tight text-[var(--color-primary)] sm:text-5xl"
          >
            اختر المدرسين
          </h2>
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
          <p className="mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            تصفح مدرسي المنصة وانتقل إلى دورات كل مدرس
          </p>
        </div>

        {sorted.length === 0 ? (
          <p className="mt-14 text-center text-slate-600 dark:text-slate-400">
            لا يوجد مدرسون حتى الآن. أنشئ حسابات من لوحة التحكم ← تعدد المدرسين.
          </p>
        ) : (
          <>
            <div className="mt-10 grid justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((t) => (
                <TeacherPublicCard
                  key={t.id}
                  teacherId={t.id}
                  name={t.name}
                  teacherSubject={t.teacherSubject}
                  teacherAvatarUrl={t.teacherAvatarUrl}
                  courses={t.courses}
                  titleTag="h3"
                />
              ))}
            </div>
            {sorted.length > 6 ? (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className="rounded-md bg-[#dc2626] px-10 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#b91c1c]"
                >
                  {expanded ? "عرض أقل" : "عرض المزيد من المدرسين"}
                </button>
              </div>
            ) : null}
            <div className="mt-8 text-center">
              <Link
                href="/teachers"
                className="text-sm font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
              >
                صفحة المدرسين الكاملة ←
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
