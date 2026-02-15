import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type LessonInput = { title: string; titleAr?: string; videoUrl?: string; content?: string; pdfUrl?: string };
type QuestionOptionInput = { text: string; isCorrect: boolean };
type QuestionInput = { type: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE"; questionText: string; options?: QuestionOptionInput[] };
type QuizInput = { title: string; questions: QuestionInput[] };

/** تحديث دورة - للأدمن ومساعد الأدمن */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  let body: {
    title?: string;
    description?: string;
    shortDesc?: string;
    imageUrl?: string;
    price?: number;
    isPublished?: boolean;
    lessons?: LessonInput[];
    quizzes?: QuizInput[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!course) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }

  const title = body.title?.trim();
  const description = body.description?.trim();
  if (!title || !description) {
    return NextResponse.json({ error: "العنوان والوصف مطلوبان" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.course.update({
      where: { id },
      data: {
        title,
        titleAr: title,
        description,
        shortDesc: body.shortDesc?.trim() || null,
        imageUrl: body.imageUrl?.trim() || null,
        price: body.price ?? 0,
        isPublished: body.isPublished ?? true,
      },
    });

    await tx.lesson.deleteMany({ where: { courseId: id } });
    const lessons = body.lessons ?? [];
    for (let i = 0; i < lessons.length; i++) {
      const le = lessons[i];
      const lessonSlug = `${course.slug}-${i + 1}`.replace(/\s+/g, "-");
      await tx.lesson.create({
        data: {
          courseId: id,
          title: le.title?.trim() || `حصة ${i + 1}`,
          titleAr: le.titleAr?.trim() || null,
          slug: lessonSlug,
          content: le.content?.trim() || null,
          videoUrl: le.videoUrl?.trim() || null,
          pdfUrl: le.pdfUrl?.trim() || null,
          order: i + 1,
        },
      });
    }

    await tx.quiz.deleteMany({ where: { courseId: id } });
    const quizzes = body.quizzes ?? [];
    for (let qi = 0; qi < quizzes.length; qi++) {
      const q = quizzes[qi];
      const quiz = await tx.quiz.create({
        data: {
          courseId: id,
          title: q.title?.trim() || `اختبار ${qi + 1}`,
          order: qi + 1,
        },
      });
      const questions = q.questions ?? [];
      for (let qti = 0; qti < questions.length; qti++) {
        const qt = questions[qti];
        const qType = qt.type === "ESSAY" ? "ESSAY" : qt.type === "TRUE_FALSE" ? "TRUE_FALSE" : "MULTIPLE_CHOICE";
        const question = await tx.question.create({
          data: {
            quizId: quiz.id,
            type: qType,
            questionText: qt.questionText?.trim() || "",
            order: qti + 1,
          },
        });
        if ((qt.type === "MULTIPLE_CHOICE" || qt.type === "TRUE_FALSE") && Array.isArray(qt.options)) {
          for (const opt of qt.options) {
            await tx.questionOption.create({
              data: {
                questionId: question.id,
                text: opt.text?.trim() || "",
                isCorrect: !!opt.isCorrect,
              },
            });
          }
        }
      }
    }
  });

  return NextResponse.json({ success: true });
}

/** جلب دورة كاملة للتعديل - للأدمن ومساعد الأدمن */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: { order: "asc" } },
      quizzes: {
        orderBy: { order: "asc" },
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { options: true },
          },
        },
      },
    },
  });
  if (!course) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }

  const payload = {
    id: course.id,
    title: course.title,
    titleAr: course.titleAr,
    slug: course.slug,
    description: course.description,
    shortDesc: course.shortDesc,
    imageUrl: course.imageUrl,
    price: Number(course.price),
    isPublished: course.isPublished,
    lessons: course.lessons.map((l) => ({
      title: l.title,
      titleAr: l.titleAr,
      videoUrl: l.videoUrl,
      content: l.content,
      pdfUrl: l.pdfUrl,
    })),
    quizzes: course.quizzes.map((q) => ({
      title: q.title,
      questions: q.questions.map((qt) => ({
        type: qt.type,
        questionText: qt.questionText,
        options: qt.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
      })),
    })),
  };
  return NextResponse.json(payload);
}

/** حذف دورة - للأدمن ومساعد الأدمن. يحذف التسجيلات والحصص والاختبارات تلقائياً (Cascade) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!course) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }

  await prisma.course.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
