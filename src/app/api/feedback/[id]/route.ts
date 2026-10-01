import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    const { id } = await params;
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { name: true } } } },
      },
    });

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // Anonymize student identity for admin view
    return NextResponse.json({
      ...feedback,
      studentId: undefined,
      student: undefined,
      submittedBy: "Anonymous",
    });
  } catch (error) {
    console.error("GET /api/feedback/[id] error:", error);
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

    const feedback = await prisma.feedback.findUnique({ where: { id } });
    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    await prisma.feedback.delete({ where: { id } });

    try {
      const adminName = await getAdminName(userId);
      await logAuditAction({
        action: "DELETED",
        entity: "Feedback",
        entityId: id,
        description: `Deleted ${feedback.type} feedback (Rating: ${feedback.rating}/5)`,
        adminClerkId: userId,
        adminName,
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/feedback/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
