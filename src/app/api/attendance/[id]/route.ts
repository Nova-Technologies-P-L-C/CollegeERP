import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = (await request.json()) as { status: AttendanceStatus };

    // Load user role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, faculty: { select: { id: true } } },
    });

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Load attendance record with course info
    const attendance = await prisma.attendance.findUnique({
      where: { id },
      select: {
        courseId: true,
        studentId: true,
        course: { select: { assignedFaculty: true, courseCode: true } },
        student: { include: { user: { select: { name: true } } } },
      },
    });

    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    // Check authorization: admin or faculty assigned to course
    const isAdmin = user.role === "ADMIN";
    const isFacultyAssignedToCourse =
      user.faculty && attendance.course.assignedFaculty === user.faculty.id;

    if (!isAdmin && !isFacultyAssignedToCourse) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: { status: body.status },
    });

    if (isAdmin) {
      try {
        const studentName = attendance.student?.user?.name ?? "Unknown";
        const adminName = await getAdminName(userId);
        await logAuditAction({
          action: "UPDATED",
          entity: "Attendance",
          entityId: id,
          description: `Changed attendance to ${body.status} for ${studentName} in ${attendance.course.courseCode}`,
          adminClerkId: userId,
          adminName,
        });
      } catch (auditError) {
        console.error("Audit log failed:", auditError);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/attendance/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { name: true } } } },
        course: { select: { courseCode: true } },
      },
    });

    if (!attendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    await prisma.attendance.delete({ where: { id } });

    try {
      const studentName = attendance.student?.user?.name ?? "Unknown";
      const adminName = await getAdminName(userId);
      await logAuditAction({
        action: "DELETED",
        entity: "Attendance",
        entityId: id,
        description: `Deleted attendance record for ${studentName} in ${attendance.course.courseCode}`,
        adminClerkId: userId,
        adminName,
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/attendance/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}