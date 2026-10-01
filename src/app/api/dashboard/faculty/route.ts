import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getFacultyDashboardData } from "@/lib/services/faculty";
import { getCachedUserRole } from "@/lib/auth-cache";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const role = await getCachedUserRole(userId);
    if (role !== "FACULTY") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const programLevel = request.nextUrl.searchParams.get("programLevel") || undefined;
    const data = await getFacultyDashboardData(userId, programLevel);

    if (!data) {
      return NextResponse.json({ error: "Faculty not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/dashboard/faculty error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
