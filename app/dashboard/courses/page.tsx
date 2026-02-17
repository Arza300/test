import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getCoursesWithCounts } from "@/lib/db";
import { CoursesManageList } from "./CoursesManageList";

export default async function DashboardCoursesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const courses = await getCoursesWithCounts();

  const coursesPlain = courses.map((c) => {
    const row = c as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      titleAr: String(row.titleAr ?? row.title_ar ?? ""),
      slug: String(row.slug ?? ""),
      isPublished: Boolean(row.isPublished ?? row.is_published ?? false),
      price: Number(row.price ?? 0),
      imageUrl: String(row.imageUrl ?? row.image_url ?? ""),
      lessonsCount: Number(row.lessonsCount ?? 0),
      enrollmentsCount: Number(row.enrollmentsCount ?? 0),
    };
  });

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
