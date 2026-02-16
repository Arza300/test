import { NextResponse } from "next/server";
import { getQuizById } from "@/lib/db";

/**
 * جلب اختبار بالمعرّف فقط — اتصال مباشر بـ Neon (بدون Prisma).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    if (!quizId || quizId.length < 20) {
      return NextResponse.json({ error: "معرّف الاختبار غير صالح" }, { status: 400 });
    }

    const result = await getQuizById(quizId);

    if (!result || !result.course) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    const isPublished = result.course.isPublished ?? result.course.is_published;
    if (!isPublished) {
      return NextResponse.json({ error: "الدورة غير منشورة" }, { status: 404 });
    }

    const payload = {
      id: result.quiz.id,
      title: result.quiz.title,
      courseId: result.quiz.courseId ?? result.quiz.course_id,
      order: result.quiz.order,
      course: {
        id: result.course.id,
        slug: result.course.slug,
        title: result.course.title,
        titleAr: result.course.titleAr ?? result.course.title_ar,
      },
      questions: result.questions.map((q) => ({
        id: q.id,
        type: q.type,
        questionText: q.questionText ?? q.question_text,
        order: q.order,
        options: (q.options ?? []).map((o: Record<string, unknown>) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect ?? o.is_correct,
        })),
      })),
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error("API quizzes [quizId]:", e);
    return NextResponse.json(
      { error: "حدث خطأ في جلب الاختبار" },
      { status: 500 }
    );
  }
}
