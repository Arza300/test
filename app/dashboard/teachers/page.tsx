import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getTeachersFeatureEnabled, getUsersByRole } from "@/lib/db";
import { TeachersAdminClient } from "./TeachersAdminClient";

export default async function TeachersAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const enabled = await getTeachersFeatureEnabled();
  const raw = enabled ? await getUsersByRole("TEACHER") : [];
  const initialTeachers = raw.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    subject: u.teacher_subject ?? null,
    avatarUrl: u.teacher_avatar_url ?? null,
    phone: u.student_number ?? null,
  }));

  return (
    <div>
      <Link href="/dashboard" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
        ← العودة للوحة التحكم
      </Link>
      <h2 className="mt-4 text-xl font-bold text-[var(--color-foreground)]">إدارة المدرسين</h2>
      <TeachersAdminClient initialEnabled={enabled} initialTeachers={initialTeachers} />
    </div>
  );
}
