import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StudentsList } from "./StudentsList";

export default async function StudentsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN") {
    redirect("/dashboard");
  }

  const [rows, courses] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: { include: { course: { select: { id: true, title: true, titleAr: true, slug: true } } } },
      },
    }),
    prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      select: { id: true, title: true, titleAr: true, slug: true },
    }),
  ]);

  const students = rows.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    balance: Number(s.balance),
    _count: s._count,
    enrollments: s.enrollments.map((e) => ({
      id: e.id,
      courseId: e.courseId,
      course: { id: e.course.id, title: e.course.title, titleAr: e.course.titleAr, slug: e.course.slug },
    })),
  }));

  const coursesPlain = courses.map((c) => ({
    id: c.id,
    title: c.title,
    titleAr: c.titleAr,
    slug: c.slug,
  }));

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
