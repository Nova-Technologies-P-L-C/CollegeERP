import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserManagementClient } from "./UserManagementClient";
import prisma from "@/lib/prisma";

export default async function UsersPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
  let role = typeof metadata?.role === "string" ? metadata.role.toUpperCase() : undefined;

  if (!role) {
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });
    role = dbUser?.role;
  }

  if (role !== "ADMIN") redirect("/dashboard");

  return <UserManagementClient />;
}
