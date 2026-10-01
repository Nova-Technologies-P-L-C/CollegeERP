import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    const { searchParams } = request.nextUrl;
    const entity = searchParams.get("entity");
    const entityId = searchParams.get("entityId");
    const programLevel = searchParams.get("programLevel") || "BS";

    const targetLevel = programLevel === "INTERMEDIATE" ? "INTERMEDIATE" : "BS";

    const whereClause: Prisma.AuditLogWhereInput = {
      ...(programLevel !== "ALL" ? { programLevel: targetLevel } : {}),
    };
    if (entity) whereClause.entity = entity;
    if (entityId) whereClause.entityId = entityId;

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("GET /api/audit-log error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
