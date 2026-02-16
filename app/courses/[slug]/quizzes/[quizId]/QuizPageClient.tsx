"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QuizTake } from "./QuizTake";

export type QuizApiPayload = {
  id: string;
  title: string;
  courseId: string;
  order: number;
  course: { id: string; slug: string | null; title: string; titleAr: string | null };
  questions: Array<{
    id: string;
    type: string;
    questionText: string;
    order: number;
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
  }>;
};

export function QuizPageClient({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<QuizApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) {
      setError("معرّف الاختبار غير صالح");
      setLoading(false);
      return;
    }
    fetch(`/api/quizzes/${encodeURIComponent(quizId)}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("الاختبار غير موجود");
          throw new Error("فشل تحميل الاختبار");
        }
        return res.json();
      })
      .then((data) => {
        setQuiz(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "حدث خطأ");
        setQuiz(null);
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-[var(--color-muted)]">جاري تحميل الاختبار...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="rounded-[var(--radius-btn)] border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-600">
          {error ?? "الاختبار غير موجود"}
        </p>
        <Link href="/courses" className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← العودة إلى الدورات
        </Link>
      </div>
    );
  }

  const courseTitle = quiz.course.titleAr ?? quiz.course.title;
  const courseHref = quiz.course.slug
    ? `/courses/${encodeURIComponent(quiz.course.slug.trim())}`
    : `/courses/${quiz.course.id}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href={courseHref} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
        ← العودة إلى {courseTitle}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--color-foreground)]">{quiz.title}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{quiz.questions.length} سؤال</p>
      <QuizTake quiz={quiz} />
    </div>
  );
}
