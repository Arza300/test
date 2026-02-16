import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUsersByRole, getEnrollmentsWithCourseByUserId, getCoursesPublished } from "@/lib/db";
import { StudentsList } from "./StudentsList";

export default async function StudentsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN") {
    redirect("/dashboard");
  }

  const [rows, coursesList] = await Promise.all([
    getUsersByRole("STUDENT"),
    getCoursesPublished(true),
  ]);

  const enrollmentsByUser = await Promise.all(rows.map((s) => getEnrollmentsWithCourseByUserId(s.id)));

  const students = rows.map((s, i) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    balance: Number(s.balance),
    _count: { enrollments: enrollmentsByUser[i].length },
    enrollments: enrollmentsByUser[i].map((e) => ({
      id: e.id,
      courseId: e.course_id,
      course: { id: e.course.id, title: e.course.title, titleAr: e.course.titleAr, slug: e.course.slug },
    })),
  }));

  const coursesPlain = coursesList.map((c) => {
    const row = c as unknown as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      titleAr: (row.titleAr != null ? String(row.titleAr) : null) as string | null,
      slug: String(row.slug ?? ""),
    };
  });

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-[var(--color-foreground)]">
        قائمة الطلاب
      </h2>
      <StudentsList students={students} courses={coursesPlain} isAdmin={isAdmin} canManageEnrollments />
    </div>
  );
}
