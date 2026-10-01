import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
    let role = typeof metadata?.role === "string" ? metadata.role.toUpperCase() : undefined;

    if (!role) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { role: true },
      });
      role = dbUser?.role;
    }

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await request.json()) as { locked: boolean };

    const grade = await prisma.grade.update({
      where: { id },
      data: { locked: body.locked },
      include: {
        student: { include: { user: { select: { name: true } } } },
        course: { select: { courseCode: true } },
      },
    });

    try {
      const adminName = await getAdminName(userId);
      await logAuditAction({
        action: "UPDATED",
        entity: "Grade",
        entityId: id,
        description: `${body.locked ? "Locked" : "Unlocked"} grade for ${grade.student.user.name ?? "Unknown"} in ${grade.course.courseCode}`,
        adminClerkId: userId,
        adminName,
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return NextResponse.json(grade);
  } catch (error) {
    console.error("PATCH /api/grades/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
    let role = typeof metadata?.role === "string" ? metadata.role.toUpperCase() : undefined;

    if (!role) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { role: true },
      });
      role = dbUser?.role;
    }

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const grade = await prisma.grade.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { name: true } } } },
        course: { select: { courseCode: true } },
      },
    });

    if (!grade) {
      return NextResponse.json({ error: "Grade not found" }, { status: 404 });
    }

    if (grade.locked) {
      return NextResponse.json({ error: "Cannot delete a locked grade" }, { status: 400 });
    }

    await prisma.grade.delete({ where: { id } });

    try {
      const adminName = await getAdminName(userId);
      await logAuditAction({
        action: "DELETED",
        entity: "Grade",
        entityId: id,
        description: `Deleted grade for ${grade.student.user.name ?? "Unknown"} in ${grade.course.courseCode}`,
        adminClerkId: userId,
        adminName,
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/grades/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
