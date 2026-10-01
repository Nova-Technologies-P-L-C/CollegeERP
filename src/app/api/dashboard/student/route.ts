import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStudentDashboardData } from "@/lib/services/student";
import { errorResponse, handleApiError } from "@/lib/api-errors";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    // 1. Try to fetch dashboard data using only userId first (extremely fast)
    let data = await getStudentDashboardData(userId);

    // If the user exists in local DB and is not a student, exit immediately
    if (data && "isNotStudent" in data) {
      return errorResponse("NOT_FOUND", "Student profile not found", 404);
    }

    // 2. If student profile is not found, fetch email from currentUser to resolve/link
    if (!data) {
      const clerkUser = await currentUser();
      const primaryEmail =
        clerkUser?.emailAddresses.find(
          (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId
        )?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress;

      data = await getStudentDashboardData(userId, primaryEmail);
      if (data && "isNotStudent" in data) {
        return errorResponse("NOT_FOUND", "Student profile not found", 404);
      }
    }

    if (!data) {
      return errorResponse("NOT_FOUND", "Student profile not found", 404);
    }
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError("GET /api/dashboard/student", error);
  }
}
