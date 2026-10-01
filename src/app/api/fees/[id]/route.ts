import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { FeeStatus, Prisma } from "@prisma/client";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole(["ADMIN", "FACULTY"]);
  if (denied) return denied;

  try {
    const { id } = await params;
    const fee = await prisma.fee.findUnique({
      where: { id },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!fee) {
      return NextResponse.json({ error: "Fee record not found" }, { status: 404 });
    }

    return NextResponse.json(fee);
  } catch (error) {
    console.error("GET /api/fees/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = (await request.json()) as { status: FeeStatus; paidDate?: string };

    const fee = await prisma.fee.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.paidDate !== undefined ? { paidDate: new Date(body.paidDate) } : {}),
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
      },
    });

    try {
      const adminName = await getAdminName(userId);
      await logAuditAction({
        action: "UPDATED",
        entity: "Fee",
        entityId: id,
        description: `Marked ${fee.type} as ${body.status} for ${fee.student.user.name ?? "Unknown Student"} (Rs. ${fee.amount.toLocaleString()})`,
        adminClerkId: userId,
        adminName,
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return NextResponse.json(fee);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Fee record not found" }, { status: 404 });
    }
    console.error("PATCH /api/fees/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const fee = await prisma.fee.findUnique({
      where: { id },
      include: { student: { include: { user: { select: { name: true } } } } },
    });

    if (!fee) {
      return NextResponse.json({ error: "Fee record not found" }, { status: 404 });
    }

    await prisma.fee.delete({ where: { id } });

    try {
      const adminName = await getAdminName(userId);
      await logAuditAction({
        action: "DELETED",
        entity: "Fee",
        entityId: id,
        description: `Deleted ${fee.type} (Rs. ${fee.amount.toLocaleString()}) for ${fee.student.user.name ?? "Unknown Student"}`,
        adminClerkId: userId,
        adminName,
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/fees/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
