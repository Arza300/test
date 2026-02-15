import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      include: { category: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(courses);
  } catch (error) {
    console.error("API courses:", error);
    return NextResponse.json(
      { error: "فشل جلب الدورات" },
      { status: 500 }
    );
  }
}

type LessonInput = { title: string; titleAr?: string; videoUrl?: string; content?: string; pdfUrl?: string };
type QuestionOptionInput = { text: string; isCorrect: boolean };
type QuestionInput = { type: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE"; questionText: string; options?: QuestionOptionInput[] };
type QuizInput = { title: string; questions: QuestionInput[] };

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  let body: {
    title: string;
    slug: string;
    description: string;
    shortDesc?: string;
    imageUrl?: string;
    price?: number;
    lessons?: LessonInput[];
    quizzes?: QuizInput[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const title = body.title?.trim();
  const slug = body.slug?.trim();
  const description = body.description?.trim();
  if (!title || !slug || !description) {
    return NextResponse.json({ error: "العنوان والرابط والوصف مطلوبة" }, { status: 400 });
  }

  const existing = await prisma.course.findUnique({ where: { slug: slug.trim() } });
  if (existing) {
    return NextResponse.json({ error: "رابط الدورة مستخدم مسبقاً" }, { status: 400 });
  }

  const course = await prisma.course.create({
    data: {
      title,
      titleAr: title,
      slug,
      description,
      shortDesc: body.shortDesc?.trim() || null,
      imageUrl: body.imageUrl?.trim() || null,
      price: body.price ?? 0,
      isPublished: true,
      createdById: session.user.id,
    },
  });

  const lessons = body.lessons ?? [];
  for (let i = 0; i < lessons.length; i++) {
    const le = lessons[i];
    const lessonSlug = `${slug.trim()}-${i + 1}`.replace(/\s+/g, "-");
    await prisma.lesson.create({
      data: {
        courseId: course.id,
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

  const quizzes = body.quizzes ?? [];
  for (let qi = 0; qi < quizzes.length; qi++) {
    const q = quizzes[qi];
    const quiz = await prisma.quiz.create({
      data: {
        courseId: course.id,
        title: q.title?.trim() || `اختبار ${qi + 1}`,
        order: qi + 1,
      },
    });
    const questions = q.questions ?? [];
    for (let qti = 0; qti < questions.length; qti++) {
      const qt = questions[qti];
      const qType = qt.type === "ESSAY" ? "ESSAY" : qt.type === "TRUE_FALSE" ? "TRUE_FALSE" : "MULTIPLE_CHOICE";
      const question = await prisma.question.create({
        data: {
          quizId: quiz.id,
          type: qType,
          questionText: qt.questionText?.trim() || "",
          order: qti + 1,
        },
      });
      if ((qt.type === "MULTIPLE_CHOICE" || qt.type === "TRUE_FALSE") && Array.isArray(qt.options)) {
        for (const opt of qt.options) {
          await prisma.questionOption.create({
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

  return NextResponse.json(course);
}
