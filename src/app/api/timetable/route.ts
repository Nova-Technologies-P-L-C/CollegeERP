import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  hasTimeOverlap,
  parseTimetablePayload,
  TIMETABLE_DAYS,
} from "@/lib/timetable";

async function getAuthenticatedAppUser(clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      role: true,
      faculty: { select: { id: true } },
      student: { select: { id: true, department: true, semester: true, shift: true } },
    },
  });

  return user;
}

function parseSemester(value: string | null): number | null | "invalid" {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return "invalid";
  return parsed;
}

async function checkRoomConflict(
  room: string,
  day: string,
  startTime: string,
  endTime: string,
  excludeId?: string
) {
  const where: Prisma.TimetableWhereInput = {
    room,
    day,
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };
  const roomEntries = await prisma.timetable.findMany({
    where,
    select: { id: true, startTime: true, endTime: true },
  });

  return roomEntries.find((entry) =>
    hasTimeOverlap(startTime, endTime, entry.startTime, entry.endTime)
  );
}

async function checkFacultyConflict(
  assignedFacultyId: string,
  day: string,
  startTime: string,
  endTime: string,
  excludeId?: string
) {
  const where: Prisma.TimetableWhereInput = {
    day,
    course: { assignedFaculty: assignedFacultyId },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };

  const facultyEntries = await prisma.timetable.findMany({
    where,
    select: { id: true, startTime: true, endTime: true },
  });

  return facultyEntries.find((entry) =>
    hasTimeOverlap(startTime, endTime, entry.startTime, entry.endTime)
  );
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const appUser = await getAuthenticatedAppUser(userId);
    if (!appUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const department = searchParams.get("department");
    const semester = searchParams.get("semester");
    const courseId = searchParams.get("courseId");
    const shift = searchParams.get("shift");

    const parsedSemester = parseSemester(semester);
    if (parsedSemester === "invalid") {
      return NextResponse.json(
        { error: "semester must be a positive integer" },
        { status: 400 }
      );
    }

    const whereClause: Prisma.TimetableWhereInput = {
      ...(courseId ? { courseId } : {}),
      ...(shift ? { shift } : {}),
    };

    if (department || parsedSemester) {
      whereClause.course = {
        ...(department ? { department } : {}),
        ...(parsedSemester ? { semester: parsedSemester } : {}),
      };
    }

    if (appUser.role === "FACULTY") {
      if (!appUser.faculty) {
        return NextResponse.json([]);
      }

      whereClause.course = {
        ...(whereClause.course as Prisma.CourseWhereInput | undefined),
        assignedFaculty: appUser.faculty.id,
      };
    }

    if (appUser.role === "STUDENT") {
      if (!appUser.student) {
        return NextResponse.json({ error: "Forbidden: Student profile not found" }, { status: 403 });
      }

      whereClause.course = {
        ...(whereClause.course as Prisma.CourseWhereInput | undefined),
        department: appUser.student.department,
        semester: appUser.student.semester,
      };
      whereClause.shift = appUser.student.shift;
    }

    const timetables = await prisma.timetable.findMany({
      where: whereClause,
      include: {
        course: {
          include: {
            faculty: { include: { user: { select: { name: true } } } },
            facultyMorning: { include: { user: { select: { name: true } } } },
            facultyEvening: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(timetables);
  } catch (error) {
    console.error("GET /api/timetable error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const appUser = await getAuthenticatedAppUser(userId);
    if (!appUser || appUser.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = parseTimetablePayload(await request.json());
    if (!payload.ok) {
      return NextResponse.json({ error: payload.error }, { status: 400 });
    }

    const body = payload.data;

    const course = await prisma.course.findUnique({
      where: { id: body.courseId },
      select: { assignedFaculty: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (!TIMETABLE_DAYS.includes(body.day)) {
      return NextResponse.json(
        { error: `day must be one of: ${TIMETABLE_DAYS.join(", ")}` },
        { status: 400 }
      );
    }

    const roomConflict = await checkRoomConflict(
      body.room,
      body.day,
      body.startTime,
      body.endTime
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
        body.endTime
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

    const timetable = await prisma.timetable.create({
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

    return NextResponse.json(timetable, { status: 201 });
  } catch (error) {
    console.error("POST /api/timetable error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}