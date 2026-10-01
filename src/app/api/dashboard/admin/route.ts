import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDashboardData } from "@/lib/services/admin";
import prisma from "@/lib/prisma";

import { getCachedUserRole } from "@/lib/auth-cache";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const programLevel = req.nextUrl.searchParams.get("programLevel") || "BS";

  try {
    const role = await getCachedUserRole(userId);
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const normalizedLevel = programLevel === "INTERMEDIATE" ? "INTERMEDIATE" : "BS";

    // Parallelize the dashboard data aggregation and recent audit logs query
    const [data, recentAuditLogs] = await Promise.all([
      getAdminDashboardData(normalizedLevel),
      prisma.auditLog.findMany({
        where: { programLevel: normalizedLevel },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          description: true,
          adminId: true,
          adminName: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      ...data,
      recentAuditLogs,
    });
  } catch (error) {
    console.error("GET /api/dashboard/admin error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
