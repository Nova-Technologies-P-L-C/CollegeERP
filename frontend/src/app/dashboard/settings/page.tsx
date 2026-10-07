import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SettingsTabs } from "./SettingsTabs";
import { fetchLaravelMe } from "@/lib/laravel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) redirect("/sign-in");

  const dbUser = await fetchLaravelMe(token);
  if (!dbUser) redirect("/sign-in");

  return (
    <SettingsTabs
      user={{
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        avatar: dbUser.avatar,
        student: dbUser.student,
        faculty: dbUser.faculty,
      }}
    />
  );
}
