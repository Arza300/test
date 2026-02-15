import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QuizTake } from "./QuizTake";

type Props = { params: Promise<{ slug: string; quizId: string }> };

export default async function QuizPage({ params }: Props) {
  const { slug, quizId } = await params;
  const session = await getServerSession(authOptions);

  const course = await prisma.course.findFirst({
    where: { slug, isPublished: true },
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

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, courseId: course.id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: true },
      },
    },
  });
  if (!quiz) notFound();

  const courseTitle = course.titleAr ?? course.title;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href={`/courses/${course.slug}`} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
        ← العودة إلى {courseTitle}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--color-foreground)]">{quiz.title}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{quiz.questions.length} سؤال</p>
      <QuizTake quiz={quiz} />
    </div>
  );
}
