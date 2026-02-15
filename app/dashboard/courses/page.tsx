import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CoursesManageList } from "./CoursesManageList";

export default async function DashboardCoursesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN") {
    redirect("/dashboard");
  }

  const courses = await prisma.course.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      titleAr: true,
      slug: true,
      isPublished: true,
      price: true,
      imageUrl: true,
      _count: { select: { lessons: true, enrollments: true } },
    },
  });

  const coursesPlain = courses.map((c) => ({
    id: c.id,
    title: c.title,
    titleAr: c.titleAr,
    slug: c.slug,
    isPublished: c.isPublished,
    price: Number(c.price),
    imageUrl: c.imageUrl,
    lessonsCount: c._count.lessons,
    enrollmentsCount: c._count.enrollments,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[var(--color-foreground)]">
          إدارة الكورسات
        </h2>
        <Link
          href="/dashboard/courses/new"
          className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          + إنشاء دورة جديدة
        </Link>
      </div>
      <CoursesManageList courses={coursesPlain} />
    </div>
  );
}
