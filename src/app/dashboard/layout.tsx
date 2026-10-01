import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ProgramLevelProvider } from "@/context/program-level-context";

export const dynamic = "force-dynamic";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getRoleLabel } from "@/lib/sidebar-config";
import type { UserRole } from "@/types";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userId: string | null = null;
  let sessionClaims: { metadata?: { role?: string } } | null = null;

  try {
    const authResult = await auth();
    userId = authResult.userId;
    sessionClaims = authResult.sessionClaims as { metadata?: { role?: string } } | null;
  } catch (error) {
    console.error("Clerk auth() error:", error);
  }

  let role: UserRole = "student";

  let redirectTo: string | null = null;
  if (userId) {
    try {
      // Query Clerk API and Database concurrently to minimize roundtrip times
      const [clerkUser, dbUserInit] = await Promise.all([
        currentUser(),
        prisma.user.findUnique({
          where: { clerkId: userId },
          include: { student: true, faculty: true, admin: true },
        })
      ]);

      const email = clerkUser?.emailAddresses[0]?.emailAddress;
      let dbUser = dbUserInit;

      // Fallback: look up by email if no record found by clerkId
      // (handles the case where the student record was created on approval before clerkId was linked)
      if (!dbUser && email) {
        const dbUserByEmail = await prisma.user.findUnique({
          where: { email },
          include: { student: true, faculty: true, admin: true },
        });
        if (dbUserByEmail) {
          if (!dbUserByEmail.clerkId) {
            // First-time sign up after admin approval
            dbUser = await prisma.user.update({
              where: { id: dbUserByEmail.id },
              data: { clerkId: userId },
              include: { student: true, faculty: true, admin: true },
            });
          } else if (dbUserByEmail.clerkId !== userId) {
            // Clerk user was deleted and recreated. Clear stale student profile & link new ID.
            if (dbUserByEmail.student) {
              await prisma.student.delete({
                where: { id: dbUserByEmail.student.id },
              });
            }
            // Delete admission records for the user's email to reset their onboarding form status
            await prisma.admission.deleteMany({
              where: { email },
            });
            dbUser = await prisma.user.update({
              where: { id: dbUserByEmail.id },
              data: { clerkId: userId },
              include: { student: true, faculty: true, admin: true },
            });
          } else {
            dbUser = dbUserByEmail;
          }
        }
      }

      const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
      const claimsRole = typeof metadata?.role === "string" ? metadata.role.toUpperCase() : undefined;

      let userRole = "STUDENT";

      if (dbUser) {
        if (claimsRole && ["ADMIN", "FACULTY", "STUDENT"].includes(claimsRole) && claimsRole !== dbUser.role) {
          try {
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: { role: claimsRole as Role },
              include: { student: true, faculty: true, admin: true },
            });
          } catch (syncError) {
            console.error("Failed to sync role from Clerk metadata to DB user:", syncError);
          }
        }
        userRole = dbUser.role;
        role = dbUser.role.toLowerCase() as UserRole;
      } else {
        // Fallback to Clerk session claims if database sync is pending (reusing cached claims)
        if (claimsRole && ["ADMIN", "FACULTY", "STUDENT"].includes(claimsRole)) {
          userRole = claimsRole;
        }
        role = userRole.toLowerCase() as UserRole;
      }

      // Provision a brand-new user record if still no record exists
      if (!dbUser) {
        const name = clerkUser ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") : "";
        if (email) {
          dbUser = await prisma.user.create({
            data: {
              clerkId: userId,
              email,
              name: name || "New User",
              role: userRole as Role,
            },
            include: { student: true, faculty: true, admin: true },
          });
        } else {
          dbUser = await prisma.user.upsert({
            where: { clerkId: userId },
            create: {
              clerkId: userId,
              email: `user_${userId}@placeholder.com`,
              name: name || "New User",
              role: userRole as Role,
            },
            update: {},
            include: { student: true, faculty: true, admin: true },
          });
        }
      }

      // Determine redirect targets based on role and profile completion
      if (dbUser) {
        const currentRole = dbUser.role;
        const hasStudent = !!dbUser.student;
        const hasFaculty = !!dbUser.faculty;
        const hasAdmin = !!dbUser.admin;

        if (currentRole === "STUDENT" && !hasStudent) {
          const checkEmail = email || dbUser.email;
          const admission = await prisma.admission.findFirst({ where: { email: checkEmail } });
          if (admission) {
            redirectTo = "/student-setup";
          } else {
            redirectTo = "/onboarding";
          }
        } else if (currentRole === "FACULTY" && !hasFaculty) {
          redirectTo = "/onboarding";
        } else if (currentRole === "ADMIN" && !hasAdmin) {
          redirectTo = "/onboarding";
        }
      } else {
        redirectTo = "/onboarding";
      }
    } catch (dbError) {
      const err = dbError as { code?: string; message?: string } & Record<string, unknown>;
      const isConnectionError =
        err?.code === "ECONNREFUSED" ||
        err?.message?.includes("ECONNREFUSED") ||
        err?.message?.includes("connect");
      if (isConnectionError) {
        console.warn("Database error fetching user role: Database is temporarily unavailable.");
      } else {
        console.error("Database error fetching user role:", dbError);
      }
    }
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  // Fallback for development/screenshot mode when Clerk is unlinked or unreachable
  if (!userId) {
    if (process.env.NODE_ENV === "production") {
      redirect("/sign-in");
    } else {
      const headersList = await headers();
      const url = headersList.get("referer") || headersList.get("x-url") || "";
      if (url.includes("/dashboard/admin")) role = "admin";
      else if (url.includes("/dashboard/faculty")) role = "faculty";
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
