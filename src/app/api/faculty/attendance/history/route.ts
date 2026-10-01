import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (!user || !["ADMIN", "FACULTY"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get("facultyId");

    if (!facultyId) {
      return NextResponse.json({ error: "facultyId is required" }, { status: 400 });
    }

    // Get date 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    const history = await prisma.facultyAttendance.findMany({
      where: {
        facultyId,
        date: {
          gte: ninetyDaysAgo,
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("GET /api/faculty/attendance/history error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
