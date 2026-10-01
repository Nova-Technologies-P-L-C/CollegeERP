import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import AdminDashboardHome from "@/components/dashboard/AdminDashboardHome";
import { StudentDashboardHome } from "@/components/dashboard/StudentDashboardHome";
import { FacultyDashboardHome } from "@/components/dashboard/FacultyDashboardHome";

export default async function DashboardPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
  let role = typeof metadata?.role === "string" ? metadata.role.toLowerCase() : undefined;

  // Fallback to database user query if metadata role is not in JWT
  if (!role) {
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });
    role = dbUser?.role.toLowerCase();
  }

  if (role === "faculty") {
    return <FacultyDashboardHome />;
  }

  if (role === "student") {
    const dbUserWithStudent = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { student: { select: { status: true } } },
    });
    if (dbUserWithStudent?.student?.status === "Graduated") {
      redirect("/graduated");
    }
    return <StudentDashboardHome />;
  }

  // Default: admin
  return <AdminDashboardHome />;
}
