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

  const session = await getServerSession(authOptions);

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
      notFound();
    }
  }
  if (!canAccess) notFound();

  const courseTitle = course.titleAr ?? course.title;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href={courseHref(course)} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
        ← العودة إلى {courseTitle}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--color-foreground)]">{quiz.title}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{quiz.questions.length} سؤال</p>
      <QuizTake quiz={quiz} />
    </div>
  );
}
