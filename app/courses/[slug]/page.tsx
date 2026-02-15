import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EnrollButton } from "./EnrollButton";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const course = await prisma.course.findFirst({
    where: { slug, isPublished: true },
  });
  if (!course) return { title: "دورة غير موجودة" };
  return {
    title: `${course.titleAr ?? course.title} | منصتي التعليمية`,
    description: course.shortDesc ?? course.description,
  };
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  let course = null;
  let isEnrolled = false;
  let userBalance = 0;
  try {
    course = await prisma.course.findFirst({
      where: { slug, isPublished: true },
      include: {
        category: true,
        lessons: { orderBy: { order: "asc" } },
        quizzes: { orderBy: { order: "asc" }, include: { _count: { select: { questions: true } } } },
      },
    });
    if (course && session?.user?.id && session.user.role === "STUDENT") {
      const [en, user] = await Promise.all([
        prisma.enrollment.findUnique({
          where: {
            userId_courseId: { userId: session.user.id, courseId: course.id },
          },
        }),
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { balance: true },
        }),
      ]);
      isEnrolled = !!en;
      userBalance = Number(user?.balance) || 0;
    }
  } catch {
    notFound();
  }
  if (!course) notFound();

  const title = course.titleAr ?? course.title;
  const categoryName = course.category?.nameAr ?? course.category?.name;
  const canEnroll = session?.user?.role === "STUDENT" && !isEnrolled;
  const canAccessContent = isEnrolled || session?.user?.role === "ADMIN" || session?.user?.role === "ASSISTANT_ADMIN";
  const coursePrice = Number(course.price) || 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link
        href="/courses"
        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        ← العودة للدورات
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* قسم المدرس */}
        <aside className="order-2 lg:order-1">
          <div className="sticky top-24 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <img
                  src="/instructor.png"
                  alt="عصام محي"
                  className="h-32 w-32 rounded-full object-cover ring-4 ring-[var(--color-primary)]/20"
                />
                <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full border-4 border-[var(--color-surface)] bg-[var(--color-success)]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--color-foreground)]">عصام محي</h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">مدرس محترف</p>
              <div className="mt-4 w-full border-t border-[var(--color-border)] pt-4">
                <p className="text-sm text-[var(--color-muted)]">
                  خبير في البرمجة والتطوير مع سنوات من الخبرة في تعليم الطلاب
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* محتوى الكورس */}
        <article className="order-1 lg:order-2">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
          <div className="aspect-video w-full bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary-light)]/30 flex items-center justify-center overflow-hidden">
            {course.imageUrl ? (
              <img
                src={course.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-6xl opacity-50">📚</span>
            )}
          </div>
          <div className="p-6 sm:p-8">
            {categoryName && (
              <span className="text-sm font-medium text-[var(--color-primary)]">
                {categoryName}
              </span>
            )}
            <h1 className="mt-2 text-3xl font-bold text-[var(--color-foreground)]">
              {title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {Number(course.price) > 0 && (
                <span className="rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-sm font-semibold text-[var(--color-primary)]">
                  {Number(course.price).toFixed(2)} ج.م
                </span>
              )}
              {course.duration && (
                <span className="rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-sm text-[var(--color-primary)]">
                  ⏱ {course.duration}
                </span>
              )}
              {course.level && (
                <span className="rounded-full bg-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-muted)]">
                  {course.level === "beginner" && "مبتدئ"}
                  {course.level === "intermediate" && "متوسط"}
                  {course.level === "advanced" && "متقدم"}
                </span>
              )}
            </div>
            <div className="mt-6 prose-custom text-[var(--color-foreground)]">
              <p>{course.description}</p>
            </div>

            {canEnroll && (
              <EnrollButton
                courseId={course.id}
                coursePrice={coursePrice}
                userBalance={userBalance}
              />
            )}
            {isEnrolled && (
              <p className="mt-4 rounded-[var(--radius-btn)] bg-[var(--color-primary-light)]/50 px-4 py-2 text-sm text-[var(--color-primary)]">
                ✓ أنت مسجّل في هذه الدورة. <Link href="/dashboard" className="font-medium underline">لوحة التحكم</Link>
              </p>
            )}

            {course.lessons.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
                  محتوى الدورة ({course.lessons.length} حصص)
                </h2>
                <ul className="mt-4 space-y-2">
                  {course.lessons.map((lesson, i) => {
                    const LessonWrapper = canAccessContent ? Link : "div";
                    const lessonProps = canAccessContent
                      ? { href: `/courses/${course!.slug}/lessons/${lesson.slug}` }
                      : {};
                    return (
                      <li key={lesson.id}>
                        <LessonWrapper
                          {...lessonProps}
                          className={`flex items-center gap-3 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-3 ${canAccessContent ? "transition hover:border-[var(--color-primary)]/30" : ""}`}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-sm font-medium text-[var(--color-primary)]">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-[var(--color-foreground)]">
                              {lesson.titleAr ?? lesson.title}
                            </span>
                            {lesson.duration && (
                              <span className="mr-2 text-sm text-[var(--color-muted)]">
                                • {lesson.duration} دقيقة
                              </span>
                            )}
                            {lesson.videoUrl && canAccessContent && (
                              <span className="mr-2 text-xs text-[var(--color-primary)]">▶ فيديو</span>
                            )}
                          </div>
                        </LessonWrapper>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {course.quizzes && course.quizzes.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
                  الاختبارات ({course.quizzes.length})
                </h2>
                <ul className="mt-4 space-y-2">
                  {course.quizzes.map((quiz, i) => (
                    <li key={quiz.id}>
                      {canAccessContent ? (
                        <Link
                          href={`/courses/${course!.slug}/quizzes/${quiz.id}`}
                          className="flex items-center justify-between rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 transition hover:border-[var(--color-primary)]/30"
                        >
                          <span className="font-medium text-[var(--color-foreground)]">{quiz.title}</span>
                          <span className="text-sm text-[var(--color-muted)]">{quiz._count.questions} سؤال</span>
                        </Link>
                      ) : (
                        <div className="flex items-center justify-between rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 opacity-75">
                          <span className="font-medium text-[var(--color-foreground)]">{quiz.title}</span>
                          <span className="text-sm text-[var(--color-muted)]">{quiz._count.questions} سؤال</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        </article>
      </div>
    </div>
  );
}
