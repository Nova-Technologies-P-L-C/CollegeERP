import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ userId: string }>;
}

/**
 * Public (unauthenticated) endpoint that returns safe-to-display
 * profile data for QR-code-based identity verification.
 *
 * Returns: name, role, department, rollNo (student), specialization (faculty),
 *          dues status (student), current timetable entry, institution name.
 *
 * NEVER exposes: email, phone, CNIC, grades, attendance, or financial amounts.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { userId } = await context.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        student: {
          select: {
            id: true,
            rollNo: true,
            department: true,
            semester: true,
            enrollmentDate: true,
            fees: {
              where: { status: { in: ["Unpaid", "Overdue"] } },
              select: { id: true },
            },
          },
        },
        faculty: {
          select: {
            id: true,
            department: true,
            specialization: true,
            joinDate: true,
          },
        },
        admin: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine current time slot for live lecture lookup
    const now = new Date();
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const currentDay = days[now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    let currentLecture: {
      courseName: string;
      courseCode: string;
      room: string;
      startTime: string;
      endTime: string;
    } | null = null;

    if (user.role === "STUDENT" && user.student) {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: user.student.id },
        select: { courseId: true },
      });

      const courseIds = enrollments.map((e) => e.courseId);

      if (courseIds.length > 0) {
        const entry = await prisma.timetable.findFirst({
          where: {
            courseId: { in: courseIds },
            day: currentDay,
            startTime: { lte: currentTime },
            endTime: { gte: currentTime },
          },
          include: {
            course: { select: { courseName: true, courseCode: true } },
          },
        });

        if (entry) {
          currentLecture = {
            courseName: entry.course.courseName,
            courseCode: entry.course.courseCode,
            room: entry.room,
            startTime: entry.startTime,
            endTime: entry.endTime,
          };
        }
      }
    }

    if (user.role === "FACULTY" && user.faculty) {
      const entry = await prisma.timetable.findFirst({
        where: {
          course: { assignedFaculty: user.faculty.id },
          day: currentDay,
          startTime: { lte: currentTime },
          endTime: { gte: currentTime },
        },
        include: {
          course: { select: { courseName: true, courseCode: true } },
        },
      });

      if (entry) {
        currentLecture = {
          courseName: entry.course.courseName,
          courseCode: entry.course.courseCode,
          room: entry.room,
          startTime: entry.startTime,
          endTime: entry.endTime,
        };
      }
    }

    // Build safe response — no private data
    const response: Record<string, unknown> = {
      name: user.name,
      role: user.role,
      institution: "Nova Technology",
      currentLecture,
    };

    if (user.role === "STUDENT" && user.student) {
      response.rollNo = user.student.rollNo;
      response.department = user.student.department;
      response.semester = user.student.semester;
      response.enrollmentDate = user.student.enrollmentDate.toISOString();
      response.duesStatus =
        user.student.fees.length > 0 ? "Outstanding" : "Clear";
    }

    if (user.role === "FACULTY" && user.faculty) {
      response.department = user.faculty.department;
      response.specialization = user.faculty.specialization;
      response.joinDate = user.faculty.joinDate.toISOString();
    }

    if (user.role === "ADMIN") {
      response.designation = "System Administrator";
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/verify/[userId] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
