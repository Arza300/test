import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        ← العودة للوحة التحكم
      </Link>
      <h2 className="mt-6 text-xl font-bold text-[var(--color-foreground)]">
        تعديل بيانات الحساب
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        البريد الحالي: {user.email} (لا يمكن تغييره من هنا)
      </p>
      <ProfileForm defaultName={user.name} />
    </div>
  );
}
