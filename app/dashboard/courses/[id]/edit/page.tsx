import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EditCourseForm } from "./EditCourseForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditCoursePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN") {
    redirect("/dashboard");
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

  if (!course) notFound();

  const initialData = {
    id: course.id,
    title: course.title,
    description: course.description,
    shortDesc: course.shortDesc ?? "",
    imageUrl: course.imageUrl ?? "",
    price: String(Number(course.price)),
    isPublished: course.isPublished,
    lessons: course.lessons.map((l) => ({
      title: l.title,
      videoUrl: l.videoUrl ?? "",
      content: l.content ?? "",
      pdfUrl: l.pdfUrl ?? "",
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

  return (
    <div>
      <Link
        href="/dashboard/courses"
        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        ← العودة إلى إدارة الكورسات
      </Link>
      <h2 className="mt-4 text-xl font-bold text-[var(--color-foreground)]">
        تعديل الدورة
      </h2>
      <EditCourseForm courseId={id} initialData={initialData} />
    </div>
  );
}
