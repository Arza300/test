import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_noStore } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QuizTake } from "./QuizTake";

type Props = { params: Promise<{ slug: string; quizId: string }> };

/** عدم التخزين المؤقت — ضروري على Vercel */
export const dynamic = "force-dynamic";
export const revalidate = 0;

function courseHref(course: { slug?: string | null; id: string }): string {
  const seg = (course.slug && course.slug.trim()) ? encodeURIComponent(course.slug.trim()) : course.id;
  return `/courses/${seg}`;
}

/**
 * جلب الاختبار بالـ quizId فقط (بدون الاعتماد على slug الكورس) لتفادي مشاكل الترميز على Vercel مع Neon.
 */
export default async function QuizPage({ params }: Props) {
  unstable_noStore();
  const { quizId } = await params;

  if (!quizId || quizId.length < 20) notFound();

  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // تجاهل خطأ الجلسة (مثلاً على Vercel) — نعرض الصفحة دون منع
  }

  let quiz: Awaited<ReturnType<typeof prisma.quiz.findUnique>> = null;
  try {
    quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: true,
        questions: {
          orderBy: { order: "asc" },
          include: { options: true },
        },
      },
    });
  } catch {
    notFound();
  }

  if (!quiz || !quiz.course) notFound();
  const course = quiz.course;

  if (!course.isPublished) notFound();

  let canAccess = false;
  if (session?.user?.role === "ADMIN" || session?.user?.role === "ASSISTANT_ADMIN") canAccess = true;
  if (session?.user?.id) {
    try {
      const en = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
      });
      if (en) canAccess = true;
    } catch {
      // لا نمنع عرض الصفحة عند خطأ في التحقق من التسجيل (مثلاً على Vercel)
    }
  }

  const courseTitle = course.titleAr ?? course.title;

  /** نسخة قابلة للتسلسل فقط للعميل — تجنّب أخطاء التسلسل على Vercel مع Neon */
  const quizForClient = {
    id: quiz.id,
    title: quiz.title,
    courseId: quiz.courseId,
    order: quiz.order,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      order: q.order,
      quizId: q.quizId,
      options: q.options.map((o) => ({
        id: o.id,
        text: o.text,
        isCorrect: o.isCorrect,
        questionId: o.questionId,
      })),
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href={courseHref(course)} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
        ← العودة إلى {courseTitle}
      </Link>
      {!canAccess && (
        <p className="mt-4 rounded-[var(--radius-btn)] border border-[var(--color-primary)]/50 bg-[var(--color-primary-light)]/20 px-4 py-2 text-sm text-[var(--color-foreground)]">
          سجّل في الدورة لتتمكن من حل الاختبار وتسجيل نتيجتك.
        </p>
      )}
      <h1 className="mt-4 text-2xl font-bold text-[var(--color-foreground)]">{quiz.title}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{quiz.questions.length} سؤال</p>
      <QuizTake quiz={quizForClient} />
    </div>
  );
}
