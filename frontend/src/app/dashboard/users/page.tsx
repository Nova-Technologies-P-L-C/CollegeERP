import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserManagementClient } from "./UserManagementClient";
import { fetchLaravelMe } from "@/lib/laravel";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) redirect("/sign-in");

  const user = await fetchLaravelMe(token);
  if (!user) redirect("/sign-in");

  const adminType = user.admin?.adminType || "";
  if ((user.role || "").toUpperCase() !== "ADMIN" || ["REGISTRAR", "ACCOUNTANT", "ORG_ADMIN"].includes(adminType)) {
    redirect("/dashboard");
  }

  return <UserManagementClient />;
}
