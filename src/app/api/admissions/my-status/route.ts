import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { errorResponse, handleApiError } from "@/lib/api-errors";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    // 1. Check if user exists in database and has a student profile (by clerkId first - extremely fast)
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { student: true },
    });

    if (dbUser?.student) {
      return NextResponse.json({ hasProfile: true, role: dbUser.role });
    }

    // 2. Fallback: Only call Clerk API if database lookup fails or student profile is missing
    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses.find(
        (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress;

    if (!email) {
      return errorResponse("BAD_REQUEST", "User email not found in Clerk", 400);
    }

    // 1b. Fallback: check by email in case the profile was created before clerkId was linked
    if (!dbUser) {
      const dbUserByEmail = await prisma.user.findUnique({
        where: { email },
        include: { student: true },
      });

      if (dbUserByEmail) {
        if (dbUserByEmail.student) {
          // Link the clerkId now so future lookups are fast
          dbUser = await prisma.user.update({
            where: { id: dbUserByEmail.id },
            data: { clerkId: userId },
            include: { student: true },
          });
          return NextResponse.json({ hasProfile: true, role: dbUser.role });
        } else {
          // User exists by email but has no student profile. Link clerkId.
          dbUser = await prisma.user.update({
            where: { id: dbUserByEmail.id },
            data: { clerkId: userId },
            include: { student: true },
          });
        }
      } else {
        // Create User record since it doesn't exist by clerkId or email
        const name = clerkUser ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") : "";
        dbUser = await prisma.user.create({
          data: {
            clerkId: userId,
            email,
            name: name || "New User",
            role: "STUDENT",
          },
          include: { student: true },
        });
      }
    }

    // 2. Search if there is an admission for this email
    const admission = await prisma.admission.findFirst({
      where: { email },
      orderBy: { applicationDate: "desc" },
    });

    // 3. Count total rejections and check block status for attempt limiting
    const rejectedCount = await prisma.admission.count({
      where: { email, status: "Rejected" },
    });
    const isBlocked = !!(await prisma.admission.findFirst({
      where: { email, blocked: true },
      select: { id: true },
    }));

    return NextResponse.json({
      hasProfile: false,
      role: dbUser?.role || "STUDENT",
      admission,
      rejectedCount,
      blocked: isBlocked,
    });
  } catch (error) {
    return handleApiError("GET /api/admissions/my-status", error);
  }
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses.find(
        (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId
      )?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress;

    if (!email) {
      return errorResponse("BAD_REQUEST", "No email address found in Clerk", 400);
    }

    // Delete the pending/rejected admissions associated with this email (if not blocked)
    await prisma.admission.deleteMany({
      where: {
        email,
        status: { in: ["Pending", "Rejected"] },
        blocked: false,
      },
    });

    // Reset User's role back to STUDENT (default onboarding status)
    await prisma.user.updateMany({
      where: { clerkId: userId },
      data: { role: "STUDENT" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError("DELETE /api/admissions/my-status", error);
  }
}
