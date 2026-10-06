import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboardHome from "@/components/dashboard/AdminDashboardHome";
import { StudentDashboardHome } from "@/components/dashboard/StudentDashboardHome";
import { FacultyDashboardHome } from "@/components/dashboard/FacultyDashboardHome";
import { fetchLaravelMe } from "@/lib/laravel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/sign-in");
  }

  const user = await fetchLaravelMe(token);

  if (!user) {
    redirect("/sign-in");
  }

  const role = (user.role || "ADMIN").toLowerCase();

  if (role === "faculty") {
    return <FacultyDashboardHome />;
  }

  if (role === "student") {
    if (user?.student?.status === "Graduated") {
      redirect("/graduated");
    }
    return <StudentDashboardHome />;
  }

  if (user?.admin?.adminType === "PLATFORM_ADMIN") {
    redirect("/dashboard/platform-admin");
  }

  if (user?.admin?.adminType === "ORG_ADMIN") {
    redirect("/dashboard/org-admin");
  }

  if (user?.admin?.adminType === "REGISTRAR") {
    redirect("/dashboard/registrar");
  }

  if (user?.admin?.adminType === "ACCOUNTANT") {
    redirect("/dashboard/accountant");
  }

  return <AdminDashboardHome />;
}
