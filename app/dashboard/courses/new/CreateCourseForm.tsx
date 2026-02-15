"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LessonRow = { title: string; videoUrl: string; content: string; pdfUrl: string };
type QuestionOptionRow = { text: string; isCorrect: boolean };
type QuestionRow = { type: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE"; questionText: string; options: QuestionOptionRow[] };
type QuizRow = { title: string; questions: QuestionRow[] };

export function CreateCourseForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    shortDesc: "",
    imageUrl: "",
    price: "",
  });
  const [lessons, setLessons] = useState<LessonRow[]>([{ title: "", videoUrl: "", content: "", pdfUrl: "" }]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([{ title: "", questions: [{ type: "MULTIPLE_CHOICE", questionText: "", options: [{ text: "", isCorrect: false }] }] }]);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [pdfUploading, setPdfUploading] = useState<number | null>(null);

  function slugify(s: string) {
    return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]+/g, "");
  }

  function addLesson() {
    setLessons((l) => [...l, { title: "", videoUrl: "", content: "", pdfUrl: "" }]);
  }
  function removeLesson(i: number) {
    setLessons((l) => l.filter((_, idx) => idx !== i));
  }
  function updateLesson(i: number, field: keyof LessonRow, value: string) {
    setLessons((l) => l.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  }

  function addQuiz() {
    setQuizzes((q) => [...q, { title: "", questions: [{ type: "MULTIPLE_CHOICE", questionText: "", options: [{ text: "", isCorrect: false }] }] }]);
  }
  function removeQuiz(qi: number) {
    setQuizzes((q) => q.filter((_, i) => i !== qi));
  }
  function updateQuizTitle(qi: number, title: string) {
    setQuizzes((q) => q.map((x, i) => (i === qi ? { ...x, title } : x)));
  }
  function addQuestion(qi: number) {
    setQuizzes((q) =>
      q.map((x, i) =>
        i === qi ? { ...x, questions: [...x.questions, { type: "MULTIPLE_CHOICE" as const, questionText: "", options: [{ text: "", isCorrect: false }] }] } : x
      )
    );
  }
  function removeQuestion(qi: number, qti: number) {
    setQuizzes((q) => q.map((x, i) => (i === qi ? { ...x, questions: x.questions.filter((_, j) => j !== qti) } : x)));
  }
  function updateQuestion(qi: number, qti: number, field: "type" | "questionText", value: string) {
    setQuizzes((q) =>
      q.map((x, i) =>
        i === qi
          ? { ...x, questions: x.questions.map((qt, j) => (j === qti ? { ...qt, [field]: value } : qt)) }
          : x
      )
    );
  }
  function setQuestionType(qi: number, qti: number, type: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE") {
    setQuizzes((q) =>
      q.map((x, i) =>
        i === qi
          ? {
              ...x,
              questions: x.questions.map((qt, j) =>
                j === qti
                  ? {
                      ...qt,
                      type,
                      options:
                        type === "MULTIPLE_CHOICE"
                          ? qt.options.length ? qt.options : [{ text: "", isCorrect: false }]
                          : type === "TRUE_FALSE"
                            ? [{ text: "صح", isCorrect: true }, { text: "خطأ", isCorrect: false }]
                            : [],
                    }
                  : qt
              ),
            }
          : x
      )
    );
  }
  function addOption(qi: number, qti: number) {
    setQuizzes((q) =>
      q.map((x, i) =>
        i === qi
          ? { ...x, questions: x.questions.map((qt, j) => (j === qti ? { ...qt, options: [...qt.options, { text: "", isCorrect: false }] } : qt)) }
          : x
      )
    );
  }
  function removeOption(qi: number, qti: number, oi: number) {
    setQuizzes((q) =>
      q.map((x, i) =>
        i === qi ? { ...x, questions: x.questions.map((qt, j) => (j === qti ? { ...qt, options: qt.options.filter((_, o) => o !== oi) } : qt)) } : x
      )
    );
  }
  function updateOption(qi: number, qti: number, oi: number, field: "text" | "isCorrect", value: string | boolean) {
    setQuizzes((q) =>
      q.map((x, i) =>
        i === qi
          ? {
              ...x,
              questions: x.questions.map((qt, j) =>
                j === qti ? { ...qt, options: qt.options.map((o, oi2) => (oi2 === oi ? { ...o, [field]: value } : o)) } : qt
              ),
            }
          : x
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const slug = slugify(form.title || "course");
    const payload = {
      title: form.title.trim(),
      slug,
      description: form.description.trim(),
      shortDesc: form.shortDesc.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      price: form.price ? parseFloat(form.price) : 0,
      lessons: lessons
        .filter((l) => l.title.trim())
        .map((l) => ({
          title: l.title.trim(),
          videoUrl: l.videoUrl.trim() || undefined,
          content: l.content.trim() || undefined,
          pdfUrl: l.pdfUrl.trim() || undefined,
        })),
      quizzes: quizzes
        .filter((q) => q.title.trim())
        .map((q) => ({
          title: q.title.trim(),
          questions: q.questions
            .filter((qt) => qt.questionText.trim())
            .map((qt) => ({
              type: qt.type,
              questionText: qt.questionText.trim(),
              options:
                qt.type === "MULTIPLE_CHOICE"
                  ? qt.options.filter((o) => o.text.trim()).map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect }))
                  : qt.type === "TRUE_FALSE"
                    ? qt.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))
                    : undefined,
            })),
        }))
        .filter((q) => q.questions.length > 0),
    };
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "فشل إنشاء الدورة");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-8">
      {error && (
        <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">بيانات الكورس</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">صورة الكورس</label>
            <p className="mt-1 text-xs text-[var(--color-muted)]">ارفع صورة (تُحفظ على R2) أو أدخل رابط صورة</p>
            {form.imageUrl && (
              <div className="mt-2 flex items-start gap-2">
                <img
                  src={form.imageUrl}
                  alt="معاينة"
                  className="h-24 w-40 rounded-[var(--radius-btn)] border border-[var(--color-border)] object-cover"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                  className="text-sm text-red-600 hover:underline"
                >
                  إزالة
                </button>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50">
                {imageUploading ? "جاري الرفع..." : "اختر صورة للرفع"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={imageUploading}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setImageUploadError("");
                    setImageUploading(true);
                    try {
                      const fd = new FormData();
                      fd.set("file", f);
                      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.url) {
                        setForm((prev) => ({ ...prev, imageUrl: data.url }));
                      } else {
                        const msg = data.missing?.length
                          ? `${data.error} ${data.missing.join(", ")}`
                          : (data.error || "فشل الرفع");
                        setImageUploadError(msg);
                      }
                    } catch {
                      setImageUploadError("فشل الاتصال بالخادم");
                    } finally {
                      setImageUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
            {imageUploadError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{imageUploadError}</p>
            )}
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => { setForm((f) => ({ ...f, imageUrl: e.target.value })); setImageUploadError(""); }}
              placeholder="أو أدخل رابط صورة: https://..."
              className="mt-2 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">السعر (ج.م)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="0"
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">عنوان الدورة (عربي) *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">وصف قصير</label>
            <input
              type="text"
              maxLength={300}
              value={form.shortDesc}
              onChange={(e) => setForm((f) => ({ ...f, shortDesc: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">الوصف الكامل *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              required
            />
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">الحصص</h3>
        <p className="mb-4 text-sm text-[var(--color-muted)]">أضف عنوان الحصة ورابط فيديو يوتيوب (اختياري) وملف PDF (اختياري)</p>
        {lessons.map((lesson, i) => (
          <div key={i} className="mb-6 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-[var(--color-foreground)]">حصة {i + 1}</span>
              {lessons.length > 1 && (
                <button type="button" onClick={() => removeLesson(i)} className="text-sm text-red-600 hover:underline">
                  حذف
                </button>
              )}
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={lesson.title}
                onChange={(e) => updateLesson(i, "title", e.target.value)}
                placeholder="عنوان الحصة"
                className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
              <input
                type="url"
                value={lesson.videoUrl}
                onChange={(e) => updateLesson(i, "videoUrl", e.target.value)}
                placeholder="رابط فيديو يوتيوب"
                className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
              <div>
                <label className="block text-xs text-[var(--color-muted)]">ملف PDF للحصة (اختياري)</label>
                {lesson.pdfUrl ? (
                  <div className="mt-1 flex items-center gap-2">
                    <a href={lesson.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-primary)] hover:underline">
                      عرض الملف
                    </a>
                    <button
                      type="button"
                      onClick={() => updateLesson(i, "pdfUrl", "")}
                      className="text-sm text-red-600 hover:underline"
                    >
                      إزالة
                    </button>
                  </div>
                ) : (
                  <label className="mt-1 inline-block cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
                    {pdfUploading === i ? "جاري الرفع..." : "اختر ملف PDF"}
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={pdfUploading !== null}
                      onChange={(async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setPdfUploading(i);
                        try {
                          const fd = new FormData();
                          fd.set("file", f);
                          const res = await fetch("/api/upload/pdf", { method: "POST", body: fd });
                          const data = await res.json().catch(() => ({}));
                          if (res.ok && data.url) updateLesson(i, "pdfUrl", data.url);
                        } finally {
                          setPdfUploading(null);
                          e.target.value = "";
                        }
                      })}
                    />
                  </label>
                )}
              </div>
              <textarea
                value={lesson.content}
                onChange={(e) => updateLesson(i, "content", e.target.value)}
                placeholder="ملاحظات أو نص الحصة (اختياري)"
                rows={2}
                className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}
        <button type="button" onClick={addLesson} className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium">
          + إضافة حصة
        </button>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">الاختبارات</h3>
        <p className="mb-4 text-sm text-[var(--color-muted)]">اختياري: أضف اختبارات وأسئلة اختيارية أو مقالية</p>
        {quizzes.map((quiz, qi) => (
          <div key={qi} className="mb-6 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <input
                type="text"
                value={quiz.title}
                onChange={(e) => updateQuizTitle(qi, e.target.value)}
                placeholder="عنوان الاختبار"
                className="flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
              />
              {quizzes.length > 1 && (
                <button type="button" onClick={() => removeQuiz(qi)} className="mr-2 text-sm text-red-600 hover:underline">
                  حذف الاختبار
                </button>
              )}
            </div>
            {quiz.questions.map((q, qti) => (
              <div key={qti} className="mb-4 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">سؤال {qti + 1}</span>
                  <select
                    value={q.type}
                    onChange={(e) => setQuestionType(qi, qti, e.target.value as "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE")}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm"
                  >
                    <option value="MULTIPLE_CHOICE">اختياري</option>
                    <option value="TRUE_FALSE">صح وخطأ</option>
                    <option value="ESSAY">مقالي</option>
                  </select>
                  {quiz.questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qi, qti)} className="text-sm text-red-600 hover:underline">
                      حذف
                    </button>
                  )}
                </div>
                <textarea
                  value={q.questionText}
                  onChange={(e) => updateQuestion(qi, qti, "questionText", e.target.value)}
                  placeholder="نص السؤال"
                  rows={2}
                  className="mb-2 w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm"
                />
                {(q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") && (
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        {q.type === "TRUE_FALSE" ? (
                          <span className="flex-1 text-sm">{opt.text}</span>
                        ) : (
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => updateOption(qi, qti, oi, "text", e.target.value)}
                            placeholder={`خيار ${oi + 1}`}
                            className="flex-1 rounded border border-[var(--color-border)] px-2 py-1 text-sm"
                          />
                        )}
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="radio"
                            name={`q-${qi}-${qti}-correct`}
                            checked={opt.isCorrect}
                            onChange={() => {
                              setQuizzes((prev) =>
                                prev.map((qu, i) =>
                                  i === qi
                                    ? {
                                        ...qu,
                                        questions: qu.questions.map((qt, j) =>
                                          j === qti ? { ...qt, options: qt.options.map((o, oi2) => ({ ...o, isCorrect: oi2 === oi })) } : qt
                                        ),
                                      }
                                    : qu
                                )
                              );
                            }}
                          />
                          صحيح
                        </label>
                        {q.type === "MULTIPLE_CHOICE" && q.options.length > 1 && (
                          <button type="button" onClick={() => removeOption(qi, qti, oi)} className="text-red-600 text-sm">
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {q.type === "MULTIPLE_CHOICE" && (
                      <button type="button" onClick={() => addOption(qi, qti)} className="text-sm text-[var(--color-primary)] hover:underline">
                        + خيار
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={() => addQuestion(qi)} className="mb-2 text-sm text-[var(--color-primary)] hover:underline">
              + سؤال
            </button>
          </div>
        ))}
        <button type="button" onClick={addQuiz} className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium">
          + إضافة اختبار
        </button>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-6 py-2 font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {loading ? "جاري الحفظ..." : "إنشاء الدورة"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-6 py-2 font-medium">
          إلغاء
        </button>
      </div>
    </form>
  );
}
