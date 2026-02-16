import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * جلب اختبار بالمعرّف فقط — يعمل بشكل موثوق على Vercel مع Neon.
 * يُستخدم من صفحة الاختبار (عميل) لتفادي مشاكل التسلسل.
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

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: { select: { id: true, slug: true, title: true, titleAr: true, isPublished: true } },
        questions: {
          orderBy: { order: "asc" },
          include: { options: true },
        },
      },
    });

    if (!quiz || !quiz.course) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    if (!quiz.course.isPublished) {
      return NextResponse.json({ error: "الدورة غير منشورة" }, { status: 404 });
    }

    const payload = {
      id: quiz.id,
      title: quiz.title,
      courseId: quiz.courseId,
      order: quiz.order,
      course: {
        id: quiz.course.id,
        slug: quiz.course.slug,
        title: quiz.course.title,
        titleAr: quiz.course.titleAr,
      },
      questions: quiz.questions.map((q) => ({
        id: q.id,
        type: q.type,
        questionText: q.questionText,
        order: q.order,
        options: q.options.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
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
