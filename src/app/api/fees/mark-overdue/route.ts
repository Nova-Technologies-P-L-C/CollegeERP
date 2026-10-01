import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

/**
 * POST /api/fees/mark-overdue
 *
 * Marks all unpaid fees whose due date has passed as "Overdue".
 * Intended to be called by a scheduled job (cron) or an admin action,
 * NOT as a side-effect of the read-only GET /api/fees handler.
 *
 * Requires ADMIN role.
 */
export async function POST() {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    const result = await prisma.fee.updateMany({
      where: {
        status: "Unpaid",
        dueDate: { lt: new Date() },
      },
      data: { status: "Overdue" },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("[POST /api/fees/mark-overdue] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
