import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { errorResponse, handleApiError } from "@/lib/api-errors";
import { AttendanceStatus } from "@prisma/client";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

function getStartOfDay(dateString?: string | null): Date {
  const d = dateString ? new Date(dateString) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    const adminUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return errorResponse("FORBIDDEN", "Admin access required", 403);
    }

    const body = (await request.json()) as {
      facultyId: string;
      date?: string;
      status: AttendanceStatus;
      notes?: string;
    };

    if (!body.facultyId || !body.status) {
      return errorResponse("BAD_REQUEST", "Faculty ID and status are required", 400);
    }

    const targetDate = getStartOfDay(body.date);

    const faculty = await prisma.faculty.findUnique({
      where: { id: body.facultyId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!faculty) {
      return errorResponse("NOT_FOUND", "Faculty member not found", 404);
    }

    const record = await prisma.facultyAttendance.upsert({
      where: {
        facultyId_date: {
          facultyId: body.facultyId,
          date: targetDate,
        },
      },
      update: {
        status: body.status,
        markedBy: userId,
        notes: body.notes ?? undefined,
      },
      create: {
        facultyId: body.facultyId,
        date: targetDate,
        status: body.status,
        markedBy: userId,
        notes: body.notes,
      },
    });

    // High-impact audit log for admin attendance override
    try {
      const adminName = await getAdminName(userId);
      const facultyName = faculty.user.name ?? faculty.user.email;
      await logAuditAction({
        action: "UPDATED",
        entity: "Faculty",
        entityId: body.facultyId,
        description: `Admin marked faculty attendance as ${body.status} for ${facultyName} on ${targetDate.toLocaleDateString()}`,
        adminClerkId: userId,
        adminName,
      });
    } catch (auditErr) {
      console.error("Failed to write admin audit log:", auditErr);
    }

    return NextResponse.json({ success: true, record });
  } catch (error) {
    return handleApiError("POST /api/faculty/attendance/admin", error);
  }
}
