import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourseWithContent, getEnrollment } from "@/lib/db";
import { YouTubeOverlayPlayer } from "@/components/YouTubeOverlayPlayer";

type Props = { params: Promise<{ slug: string; lessonSlug: string }> };

function decodeSegment(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function isCourseId(segment: string): boolean {
  return /^c[a-z0-9]{24}$/i.test(segment);
}

function isLessonId(segment: string): boolean {
  return /^c[a-z0-9]{24}$/i.test(segment);
}

function courseHref(course: { slug?: string | null; id: string }): string {
  const segment = (course.slug && course.slug.trim()) ? encodeURIComponent(course.slug.trim()) : course.id;
  return `/courses/${segment}`;
}

function lessonHref(course: { slug?: string | null; id: string }, lesson: { slug?: string | null; id: string }): string {
  const courseSeg = (course.slug && course.slug.trim()) ? encodeURIComponent(course.slug.trim()) : course.id;
  const lessonSeg = (lesson.slug && lesson.slug.trim()) ? encodeURIComponent(lesson.slug.trim()) : lesson.id;
  return `/courses/${courseSeg}/lessons/${lessonSeg}`;
}

export default async function LessonPage({ params }: Props) {
  const { slug: courseSegment, lessonSlug: lessonSegment } = await params;
  const courseDecoded = decodeSegment(courseSegment);
  const lessonDecoded = decodeSegment(lessonSegment);
  const session = await getServerSession(authOptions);

  const data = await getCourseWithContent(courseDecoded);
  if (!data?.course) notFound();

  const course = data.course as unknown as Record<string, unknown> & { id: string; lessons: Record<string, unknown>[] };
  course.lessons = data.lessons;

  let canAccess = false;
  if (session?.user?.role === "ADMIN" || session?.user?.role === "ASSISTANT_ADMIN") canAccess = true;
  if (session?.user?.id) {
    const en = await getEnrollment(session.user.id, course.id);
    if (en) canAccess = true;
  }
  if (!canAccess) notFound();

  const lesson = isLessonId(lessonDecoded)
    ? data.lessons.find((l: Record<string, unknown>) => l.id === lessonDecoded)
    : data.lessons.find((l: Record<string, unknown>) => l.slug === lessonDecoded);
  if (!lesson) notFound();

  const lessonObj = lesson as Record<string, unknown>;
  const videoUrl = (lessonObj.videoUrl ?? lessonObj.video_url) as string;
  const courseTitle = (course.titleAr ?? course.title) as string;
  const lessonTitle = (lessonObj.titleAr ?? lessonObj.title) as string;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href={courseHref(course)} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
        ← العودة إلى {courseTitle}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--color-foreground)]">{lessonTitle}</h1>

      {videoUrl && (
        <div className="mt-6 w-full">
          <YouTubeOverlayPlayer videoUrl={videoUrl} title={lessonTitle} />
        </div>
      )}

      {(lessonObj.pdfUrl ?? lessonObj.pdf_url) ? (
        <div className="mt-6">
          <a
            href={String(lessonObj.pdfUrl ?? lessonObj.pdf_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            📄 تحميل / عرض ملف PDF
          </a>
        </div>
      ) : null}

      {lessonObj.content ? (
        <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 prose-custom text-[var(--color-foreground)]">
          {String(lessonObj.content).split("\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : null}

      <div className="mt-8 flex gap-2">
        {(() => {
          const idx = course.lessons.findIndex((l: Record<string, unknown>) => l.id === lessonObj.id);
          const prev = course.lessons[idx - 1];
          const next = course.lessons[idx + 1];
          return (
            <div className="flex w-full justify-between gap-4">
              {prev ? (
                <Link
                  href={lessonHref(course, prev as { slug?: string | null; id: string })}
                  className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
                >
                  ← الحصة السابقة
                </Link>
              ) : <span />}
              {next ? (
                <Link
                  href={lessonHref(course, next as { slug?: string | null; id: string })}
                  className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
                >
                  الحصة التالية →
                </Link>
              ) : null}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
