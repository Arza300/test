"use client";

import { useState } from "react";
import type { Quiz, Question, QuestionOption } from "@prisma/client";

type QuizWithQuestions = Quiz & {
  questions: (Question & { options: QuestionOption[] })[];
};

export function QuizTake({ quiz }: { quiz: QuizWithQuestions }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function setAnswer(questionId: string, value: string) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
  }

  const allAnswered = quiz.questions.every((q) => {
    const a = answers[q.id];
    if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") return a !== undefined && a !== "";
    return true;
  });

  let score = 0;
  if (submitted) {
    quiz.questions.forEach((q) => {
      if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
        const opt = q.options.find((o) => o.id === answers[q.id]);
        if (opt?.isCorrect) score++;
      }
    });
  }
  const totalScored = quiz.questions.filter((q) => q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE").length;

  return (
    <div className="mt-8 space-y-8">
      {quiz.questions.map((q, i) => (
        <div
          key={q.id}
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        >
          <p className="font-medium text-[var(--color-foreground)]">
            {i + 1}. {q.questionText}
          </p>
          <span className="mt-1 block text-xs text-[var(--color-muted)]">
            {q.type === "MULTIPLE_CHOICE" ? "اختياري" : q.type === "TRUE_FALSE" ? "صح وخطأ" : "مقالي"}
          </span>
          {(q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") ? (
            <ul className="mt-4 space-y-2">
              {q.options.map((opt) => (
                <li key={opt.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded border border-[var(--color-border)] p-3 hover:bg-[var(--color-background)]">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.id}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswer(q.id, opt.id)}
                      disabled={submitted}
                    />
                    <span>{opt.text}</span>
                    {submitted && opt.isCorrect && (
                      <span className="text-sm text-[var(--color-success)]">✓ إجابة صحيحة</span>
                    )}
                    {submitted && answers[q.id] === opt.id && !opt.isCorrect && (
                      <span className="text-sm text-red-600">✗</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <textarea
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder="اكتب إجابتك هنا..."
              rows={4}
              disabled={submitted}
              className="mt-4 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          )}
        </div>
      ))}

      {!submitted ? (
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          disabled={!allAnswered}
          className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-6 py-3 font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          إنهاء وإظهار النتيجة
        </button>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-primary)] bg-[var(--color-primary-light)]/30 p-6">
          <p className="text-lg font-semibold text-[var(--color-foreground)]">
            نتيجتك في الأسئلة الاختيارية وصح/خطأ: {score} من {totalScored}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            الأسئلة المقالية لا تُصحح تلقائياً؛ يمكن للمدرس مراجعتها لاحقاً.
          </p>
        </div>
      )}
    </div>
  );
}
