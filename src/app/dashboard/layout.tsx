import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProgramLevelProvider } from "@/context/program-level-context";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getRoleLabel } from "@/lib/sidebar-config";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/sign-in");
  }

  let role: UserRole = "student";

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

    const user = await res.json();
    role = (user.role || "STUDENT").toLowerCase() as UserRole;
  } catch (err) {
    console.error("DashboardLayout fetch user error:", err);
  }

  const roleLabel = getRoleLabel(role);

  return (
    <ProgramLevelProvider>
      <DashboardShell role={role} roleLabel={roleLabel}>
        {children}
      </DashboardShell>
    </ProgramLevelProvider>
  );
}
