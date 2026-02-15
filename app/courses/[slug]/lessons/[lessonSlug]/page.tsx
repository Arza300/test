import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

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

  const course = await prisma.course.findFirst({
    where: isCourseId(courseDecoded)
      ? { id: courseDecoded, isPublished: true }
      : { slug: courseDecoded, isPublished: true },
    include: {
      lessons: { orderBy: { order: "asc" } },
    },
  });
  if (!course) notFound();

  let canAccess = false;
  if (session?.user?.role === "ADMIN" || session?.user?.role === "ASSISTANT_ADMIN") canAccess = true;
  if (session?.user?.id) {
    const en = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
    });
    if (en) canAccess = true;
  }
  if (!canAccess) notFound();

  const lesson = isLessonId(lessonDecoded)
    ? course.lessons.find((l) => l.id === lessonDecoded)
    : course.lessons.find((l) => l.slug === lessonDecoded);
  if (!lesson) notFound();

  const embedUrl = getYouTubeEmbedUrl(lesson.videoUrl);
  const courseTitle = course.titleAr ?? course.title;
  const lessonTitle = lesson.titleAr ?? lesson.title;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href={courseHref(course)} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
        ← العودة إلى {courseTitle}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--color-foreground)]">{lessonTitle}</h1>

      {embedUrl && (
        <div className="mt-6 aspect-video w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-black">
          <iframe
            src={embedUrl}
            title={lessonTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}

      {lesson.pdfUrl && (
        <div className="mt-6">
          <a
            href={lesson.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            📄 تحميل / عرض ملف PDF
          </a>
        </div>
      )}

      {lesson.content && (
        <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 prose-custom text-[var(--color-foreground)]">
          {lesson.content.split("\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      <div className="mt-8 flex gap-2">
        {(() => {
          const idx = course.lessons.findIndex((l) => l.id === lesson.id);
          const prev = course.lessons[idx - 1];
          const next = course.lessons[idx + 1];
          return (
            <div className="flex w-full justify-between gap-4">
              {prev ? (
                <Link
                  href={lessonHref(course, prev)}
                  className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
                >
                  ← الحصة السابقة
                </Link>
              ) : <span />}
              {next ? (
                <Link
                  href={lessonHref(course, next)}
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
