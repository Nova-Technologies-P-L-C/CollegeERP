import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { Prisma } from "@prisma/client";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    // Load user role to check authorization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, faculty: { select: { id: true } }, student: { select: { id: true } } },
    });

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Determine if user should see enrollments
    const isAdmin = user.role === "ADMIN";
    const isFaculty = user.role === "FACULTY";

    // If faculty, verify they're assigned to this course
    let canSeeEnrollments = isAdmin;
    if (isFaculty && user.faculty) {
      const courseCheck = await prisma.course.findUnique({
        where: { id },
        select: { assignedFaculty: true, assignedFacultyMorning: true, assignedFacultyEvening: true },
      });
      canSeeEnrollments =
        courseCheck?.assignedFaculty === user.faculty.id ||
        courseCheck?.assignedFacultyMorning === user.faculty.id ||
        courseCheck?.assignedFacultyEvening === user.faculty.id;
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        faculty: {
          select: {
            id: true,
            department: true,
            user: { select: { name: true } }
          }
        },
        facultyMorning: {
          select: {
            id: true,
            department: true,
            user: { select: { name: true } }
          }
        },
        facultyEvening: {
          select: {
            id: true,
            department: true,
            user: { select: { name: true } }
          }
        },
        timetables: true,
        ...(canSeeEnrollments
          ? { enrollments: { include: { student: { include: { user: { select: { name: true } } } } } } }
          : {}),
      },
    });

    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    return NextResponse.json(course);
  } catch (error) {
    console.error("GET /api/courses/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole(["ADMIN", "FACULTY"]);
  if (denied) return denied;

  try {
    const { userId } = await auth();
    const { id } = await params;
    const body = (await request.json()) as {
      courseCode?: string;
      courseName?: string;
      creditHours?: number;
      department?: string;
      semester?: number;
      assignedFaculty?: string | null;
      assignedFacultyMorning?: string | null;
      assignedFacultyEvening?: string | null;
      shift?: string;
    };

    const updateData: Prisma.CourseUpdateInput = {
      ...(body.courseCode !== undefined ? { courseCode: body.courseCode } : {}),
      ...(body.courseName !== undefined ? { courseName: body.courseName } : {}),
      ...(body.creditHours !== undefined ? { creditHours: body.creditHours } : {}),
      ...(body.department !== undefined ? { department: body.department } : {}),
      ...(body.semester !== undefined ? { semester: body.semester } : {}),
      ...(body.shift !== undefined ? { shift: body.shift } : {}),
    };

    if (body.assignedFacultyMorning !== undefined) {
      updateData.facultyMorning = body.assignedFacultyMorning
        ? { connect: { id: body.assignedFacultyMorning } }
        : { disconnect: true };
    }

    if (body.assignedFacultyEvening !== undefined) {
      updateData.facultyEvening = body.assignedFacultyEvening
        ? { connect: { id: body.assignedFacultyEvening } }
        : { disconnect: true };
    }

    if (body.assignedFaculty !== undefined) {
      if (body.assignedFaculty === null) {
        if (body.shift === "Morning") {
          updateData.facultyMorning = { disconnect: true };
          updateData.faculty = { disconnect: true };
        } else if (body.shift === "Evening") {
          updateData.facultyEvening = { disconnect: true };
          updateData.faculty = { disconnect: true };
        } else {
          updateData.faculty = { disconnect: true };
          updateData.facultyMorning = { disconnect: true };
          updateData.facultyEvening = { disconnect: true };
        }
      } else {
        updateData.faculty = { connect: { id: body.assignedFaculty } };
        if (body.shift === "Morning") {
          updateData.facultyMorning = { connect: { id: body.assignedFaculty } };
        } else if (body.shift === "Evening") {
          updateData.facultyEvening = { connect: { id: body.assignedFaculty } };
        } else if (body.shift === "Both") {
          updateData.facultyMorning = { connect: { id: body.assignedFaculty } };
          updateData.facultyEvening = { connect: { id: body.assignedFaculty } };
        }
      }
    }

    const course = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        faculty: {
          select: {
            id: true,
            department: true,
            user: { select: { name: true } }
          }
        },
        facultyMorning: {
          select: {
            id: true,
            department: true,
            user: { select: { name: true } }
          }
        },
        facultyEvening: {
          select: {
            id: true,
            department: true,
            user: { select: { name: true } }
          }
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (userId) {
      try {
        const adminName = await getAdminName(userId);
        let auditDesc = `Updated course ${course.courseCode} — ${course.courseName}`;
        if (body.assignedFaculty !== undefined) {
          if (course.faculty?.user?.name) {
            auditDesc = `Faculty "${course.faculty.user.name}" assigned to course ${course.courseCode}`;
          } else {
            auditDesc = `Faculty assigned to course ${course.courseCode}`;
          }
        }
        await logAuditAction({
          action: "UPDATED",
          entity: "Course",
          entityId: id,
          description: auditDesc,
          adminClerkId: userId,
          adminName,
        });
      } catch (auditError) {
        console.error("Audit log failed:", auditError);
      }
    }

    return NextResponse.json(course);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Course code already exists" }, { status: 409 });
      }
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
      }
    }
    console.error("PATCH /api/courses/[id] error:", error);
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
    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      select: { courseCode: true, courseName: true },
    });

    await prisma.course.delete({ where: { id } });

    if (userId && course) {
      try {
        const adminName = await getAdminName(userId);
        await logAuditAction({
          action: "DELETED",
          entity: "Course",
          entityId: id,
          description: `Deleted course ${course.courseCode} — ${course.courseName}`,
          adminClerkId: userId,
          adminName,
        });
      } catch (auditError) {
        console.error("Audit log failed:", auditError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    console.error("DELETE /api/courses/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}