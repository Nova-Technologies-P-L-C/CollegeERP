import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserManagementClient } from "./UserManagementClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) redirect("/sign-in");

  try {
    const res = await fetch("http://127.0.0.1:8000/api/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) redirect("/sign-in");

    const user = await res.json();
    if ((user.role || "").toUpperCase() !== "ADMIN") {
      redirect("/dashboard");
    }
  } catch (err) {
    console.error("UsersPage fetch user error:", err);
  }

  return <UserManagementClient />;
}
