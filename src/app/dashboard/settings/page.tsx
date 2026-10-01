import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { SettingsTabs } from "./SettingsTabs";

/**
 * Settings page — Server Component wrapper.
 * Fetches the full profile record to power the split-panel settings UI.
 */
export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      student: {
        select: { phone: true, department: true, rollNo: true },
      },
      faculty: {
        select: { phone: true, department: true },
      },
    },
  });

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
