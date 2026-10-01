import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { errorResponse, handleApiError } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const cacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Content-Type": "application/json",
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    // 2. Fetch email from Clerk to check pending requests
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress;

    // 1. Fetch user from DB
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ clerkId: userId }, ...(email ? [{ email }] : [])],
      },
      include: { student: true, faculty: true, admin: true },
    });

    if (dbUser) {
      const isComplete =
        (dbUser.role === "STUDENT" && !!dbUser.student) ||
        (dbUser.role === "FACULTY" && !!dbUser.faculty) ||
        (dbUser.role === "ADMIN" && !!dbUser.admin);

      if (isComplete) {
        return NextResponse.json(
          { hasProfile: true, role: dbUser.role },
          { headers: cacheHeaders }
        );
      }
    }

    const adminsCount = await prisma.admin.count();
    const isFirstAdmin = adminsCount === 0;

    const checkEmail = email || dbUser?.email;

    if (!checkEmail) {
      return NextResponse.json(
        {
          hasProfile: false,
          role: dbUser?.role || "STUDENT",
          isFirstAdmin,
        },
        { headers: cacheHeaders }
      );
    }

    // 3. Look up pending/rejected onboarding requests
    const [request, admission] = await Promise.all([
      prisma.onboardingRequest.findFirst({
        where: { email: checkEmail },
        orderBy: { createdAt: "desc" },
      }),
      prisma.admission.findFirst({
        where: { email: checkEmail },
        orderBy: { applicationDate: "desc" },
      }),
    ]);

    return NextResponse.json(
      {
        hasProfile: false,
        role: dbUser?.role || "STUDENT",
        request,
        admission,
        isFirstAdmin,
      },
      { headers: cacheHeaders }
    );
  } catch (error) {
    return handleApiError("GET /api/onboarding/status", error);
  }
}
