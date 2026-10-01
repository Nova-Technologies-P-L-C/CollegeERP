import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { hasTimeOverlap, parseTimetablePayload } from "@/lib/timetable";
import { auth } from "@clerk/nextjs/server";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) {
    return {
      denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      userId: null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });

  if (!user || user.role?.toUpperCase() !== "ADMIN") {
    return {
      denied: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      userId,
    };
  }

  return { denied: null, userId };
}

async function checkRoomConflict(
  room: string,
  day: string,
  startTime: string,
  endTime: string,
  excludeId: string
) {
  const entries = await prisma.timetable.findMany({
    where: { room, day, id: { not: excludeId } },
    select: { startTime: true, endTime: true },
  });

  return entries.find((entry) =>
    hasTimeOverlap(startTime, endTime, entry.startTime, entry.endTime)
  );
}

async function checkFacultyConflict(
  assignedFacultyId: string,
  day: string,
  startTime: string,
  endTime: string,
  excludeId: string
) {
  const entries = await prisma.timetable.findMany({
    where: {
      day,
      id: { not: excludeId },
      course: { assignedFaculty: assignedFacultyId },
    },
    select: { startTime: true, endTime: true },
  });

  return entries.find((entry) =>
    hasTimeOverlap(startTime, endTime, entry.startTime, entry.endTime)
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;

    const existing = await prisma.timetable.findUnique({
      where: { id },
      select: {
        id: true,
        courseId: true,
        room: true,
        day: true,
        startTime: true,
        endTime: true,
        shift: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });
    }

    const incoming = (await request.json()) as Partial<{
      courseId: string;
      room: string;
      day: string;
      startTime: string;
      endTime: string;
      shift: string;
    }>;

    const mergedPayload = {
      courseId: incoming.courseId ?? existing.courseId,
      room: incoming.room ?? existing.room,
      day: incoming.day ?? existing.day,
      startTime: incoming.startTime ?? existing.startTime,
      endTime: incoming.endTime ?? existing.endTime,
      shift: incoming.shift ?? existing.shift,
    };

    const parsed = parseTimetablePayload(mergedPayload);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const body = parsed.data;

    const course = await prisma.course.findUnique({
      where: { id: body.courseId },
      select: { assignedFaculty: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const roomConflict = await checkRoomConflict(
      body.room,
      body.day,
      body.startTime,
      body.endTime,
      id
    );
    if (roomConflict) {
      return NextResponse.json(
        {
          error: `Room "${body.room}" is already booked on ${body.day} between ${body.startTime} and ${body.endTime}`,
        },
        { status: 409 }
      );
    }

    if (course.assignedFaculty) {
      const facultyConflict = await checkFacultyConflict(
        course.assignedFaculty,
        body.day,
        body.startTime,
        body.endTime,
        id
      );

      if (facultyConflict) {
        return NextResponse.json(
          {
            error: `Assigned faculty is already scheduled on ${body.day} between ${body.startTime} and ${body.endTime}`,
          },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.timetable.update({
      where: { id },
      data: {
        courseId: body.courseId,
        room: body.room,
        day: body.day,
        startTime: body.startTime,
        endTime: body.endTime,
        shift: body.shift,
      },
      include: {
        course: {
          include: {
            faculty: { include: { user: { select: { name: true } } } },
          },
        },
      },
    });

    const { userId: adminUserId } = await requireAdmin();
    if (adminUserId) {
      try {
        const adminName = await getAdminName(adminUserId);
        await logAuditAction({
          action: "UPDATED",
          entity: "Timetable",
          entityId: id,
          description: `Updated timetable: ${updated.course.courseCode ?? "Unknown"} on ${body.day} ${body.startTime}-${body.endTime} in ${body.room}`,
          adminClerkId: adminUserId,
          adminName,
        });
      } catch (auditError) {
        console.error("Audit log failed:", auditError);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/timetable/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;

    const entry = await prisma.timetable.findUnique({
      where: { id },
      include: { course: { select: { courseCode: true } } },
    });

    await prisma.timetable.delete({ where: { id } });

    const { userId: adminUserId } = await requireAdmin();
    if (adminUserId && entry) {
      try {
        const adminName = await getAdminName(adminUserId);
        await logAuditAction({
          action: "DELETED",
          entity: "Timetable",
          entityId: id,
          description: `Deleted timetable entry for ${entry.course.courseCode} on ${entry.day}`,
          adminClerkId: adminUserId,
          adminName,
        });
      } catch (auditError) {
        console.error("Audit log failed:", auditError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });
    }
    console.error("DELETE /api/timetable/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
