import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SettingsTabs } from "./SettingsTabs";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) redirect("/sign-in");

  let dbUser: any = null;

  try {
    const res = await fetch("http://127.0.0.1:8000/api/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) redirect("/sign-in");

    dbUser = await res.json();
  } catch (err) {
    console.error("SettingsPage fetch error:", err);
  }

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
