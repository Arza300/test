import { prisma } from "@/lib/db";
import { CourseCard } from "@/components/CourseCard";

export const metadata = {
  title: "الدورات | منصتي التعليمية",
  description: "تصفح جميع الدورات المتاحة والبدء في التعلم",
};

export default async function CoursesPage() {
  let courses: Awaited<ReturnType<typeof prisma.course.findMany>> = [];
  try {
    courses = await prisma.course.findMany({
      where: { isPublished: true },
      include: { category: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
  } catch {
    // DB not connected
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[var(--color-foreground)]">
          جميع الدورات
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          اختر الدورة المناسبة وابدأ التعلم خطوة بخطوة
        </p>
      </div>

      {courses.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-12 text-center">
          <p className="text-[var(--color-muted)]">
            لا توجد دورات منشورة حالياً. تأكد من إعداد قاعدة البيانات وتشغيل
            البذرة (seed).
          </p>
        </div>
      )}
    </div>
  );
}
