import Link from "next/link";

export type TeacherCardCourse = { id: string; slug: string; title: string };

type Props = {
  teacherId: string;
  name: string;
  teacherSubject: string | null;
  teacherAvatarUrl: string | null;
  courses: TeacherCardCourse[];
  titleTag?: "h2" | "h3";
};

/** بطاقة مدرس — التخصص وقائمة دوراته المنشورة داخل البطاقة فقط */
export function TeacherPublicCard({
  teacherId,
  name,
  teacherSubject,
  teacherAvatarUrl,
  courses,
  titleTag: TitleTag = "h3",
}: Props) {
  const subject = teacherSubject?.trim() || "مدرس على المنصة";
  const profileHref = `/courses?teacher=${encodeURIComponent(teacherId)}`;
  const previewCourses = courses.slice(0, 2);
  const moreCount = courses.length > 2 ? courses.length - 2 : 0;

  return (
    <article
      dir="rtl"
      className="group flex w-full max-w-[16.5rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#13494b] via-[#0d3234] to-[#061a1c] p-4 shadow-[0_14px_40px_-14px_rgba(0,0,0,0.55)] ring-1 ring-black/25 transition duration-300 hover:-translate-y-1 hover:border-[var(--color-primary)]/45 hover:shadow-[0_20px_44px_-14px_rgba(45,212,191,0.22)] sm:max-w-[17.25rem]"
    >
      <Link href={profileHref} className="block shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d3234]">
        <div className="relative mx-auto aspect-square w-full max-w-[12.5rem] shrink-0 overflow-hidden rounded-xl bg-black/25 ring-1 ring-white/15">
          {teacherAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={teacherAvatarUrl}
              alt=""
              className="h-full w-full object-cover object-center transition duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/5">
              <span className="text-5xl font-bold tracking-tight text-white/25 transition group-hover:text-white/35">
                {(name?.trim()[0] ?? "?").toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="mt-5 flex flex-col items-center pb-0.5 pt-1 text-center">
          <TitleTag className="line-clamp-2 text-lg font-bold leading-snug text-white sm:text-xl">
            {name}
          </TitleTag>
          <p className="mt-2 line-clamp-2 max-w-[14rem] text-sm font-normal leading-relaxed text-white/80">
            {subject}
          </p>
        </div>
      </Link>

      <div className="mt-4 min-h-[3.25rem] flex-1 border-t border-white/10 pt-3">
        {courses.length > 0 ? (
          <>
            <p className="mb-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-white/45">
              الدورات
            </p>
            <ul className="space-y-2 px-1 text-right">
              {previewCourses.map((c) => (
                <li
                  key={c.id}
                  className="text-sm leading-snug text-white/85 [text-wrap:pretty]"
                >
                  <span className="line-clamp-2">{c.title}</span>
                </li>
              ))}
            </ul>
            {moreCount > 0 ? (
              <p className="mt-2 text-center text-[0.7rem] text-white/50">
                {moreCount === 1
                  ? "ودورة إضافية…"
                  : `و${moreCount} دورات إضافية…`}
              </p>
            ) : null}
            <Link
              href={profileHref}
              className="mt-3 block text-center text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              صفحة جميع دورات المدرس ←
            </Link>
          </>
        ) : (
          <p className="px-1 text-center text-xs leading-relaxed text-white/55">
            لا توجد دورات منشورة ضمن بطاقة هذا المدرس حتى الآن.
          </p>
        )}
      </div>
    </article>
  );
}
