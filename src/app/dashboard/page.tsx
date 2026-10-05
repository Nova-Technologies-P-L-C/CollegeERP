import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboardHome from "@/components/dashboard/AdminDashboardHome";
import { StudentDashboardHome } from "@/components/dashboard/StudentDashboardHome";
import { FacultyDashboardHome } from "@/components/dashboard/FacultyDashboardHome";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/sign-in");
  }

  let role = "admin";
  let user: any = null;

  try {
    const res = await fetch("http://127.0.0.1:8000/api/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      redirect("/sign-in");
    }

    user = await res.json();
    role = (user.role || "ADMIN").toLowerCase();
  } catch (err) {
    console.error("DashboardPage fetch user error:", err);
  }

  if (role === "faculty") {
    return <FacultyDashboardHome />;
  }

  if (role === "student") {
    if (user?.student?.status === "Graduated") {
      redirect("/graduated");
    }
    return <StudentDashboardHome />;
  }

  return <AdminDashboardHome />;
}
