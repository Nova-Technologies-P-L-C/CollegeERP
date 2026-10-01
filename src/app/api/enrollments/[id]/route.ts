import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { errorResponse, handleApiError, parseJsonBody } from "@/lib/api-errors";

interface EnrollmentUpdateBody {
  blocked?: boolean;
  readmitRequested?: boolean;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, faculty: { select: { id: true } } },
    });

    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: { select: { assignedFaculty: true, courseCode: true } },
        student: { include: { user: { select: { name: true } } } },
      },
    });

    if (!enrollment) {
      return errorResponse("NOT_FOUND", "Enrollment record not found", 404);
    }

    const isAdmin = user.role === "ADMIN";
    const isFacultyAssigned =
      user.faculty && enrollment.course.assignedFaculty === user.faculty.id;

    if (!isAdmin && !isFacultyAssigned) {
      return errorResponse("FORBIDDEN", "Forbidden: You are not assigned to this course", 403);
    }

    const body = await parseJsonBody<EnrollmentUpdateBody>(request);

    const updateData: { blocked?: boolean; readmitRequested?: boolean } = {};
    if (body.blocked !== undefined) {
      updateData.blocked = body.blocked;
      if (body.blocked === false) {
        updateData.readmitRequested = false;
      }
    }
    if (body.readmitRequested !== undefined) {
      updateData.readmitRequested = body.readmitRequested;
    }

    const updated = await prisma.enrollment.update({
      where: { id },
      data: updateData,
      include: {
        course: { select: { courseCode: true, courseName: true } },
        student: { include: { user: { select: { name: true } } } },
      },
    });

    const studentName = updated.student.user.name || "Student";
    const courseCode = updated.course.courseCode;
    const actionDesc = updated.blocked
      ? `Struck Off ${studentName} from course ${courseCode}`
      : updated.readmitRequested
      ? `Requested Re-Admission for ${studentName} in course ${courseCode}`
      : `Re-activated enrollment for ${studentName} in course ${courseCode}`;

    const { getAdminName, logAuditAction } = await import("@/lib/audit-log");
    const adminName = await getAdminName(userId);
    await logAuditAction({
      action: "UPDATED",
      entity: "Enrollment",
      entityId: updated.id,
      description: actionDesc,
      adminClerkId: userId,
      adminName,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError("PATCH /api/enrollments/[id]", error);
  }
}
