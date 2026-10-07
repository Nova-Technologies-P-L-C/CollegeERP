import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProgramLevelProvider } from "@/context/program-level-context";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getRoleLabel } from "@/lib/sidebar-config";
import type { UserRole } from "@/types";
import { fetchLaravelMe } from "@/lib/laravel";

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

  const user = await fetchLaravelMe(token);

  if (!user) {
    redirect("/sign-in");
  }

  let role: UserRole = (user.role || "STUDENT").toLowerCase() as UserRole;
  if (role === "admin") {
    if (user.admin?.adminType === "PLATFORM_ADMIN") {
      role = "platform_admin";
    } else if (user.admin?.adminType === "ORG_ADMIN") {
      role = "org_admin";
    } else if (user.admin?.adminType === "REGISTRAR") {
      role = "registrar";
    } else if (user.admin?.adminType === "ACCOUNTANT") {
      role = "accountant";
    }
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
