import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasTimeOverlap } from "@/lib/timetable";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only admins can batch update timetables" }, { status: 403 });
    }

    const body = (await request.json()) as {
      department: string;
      semester: number;
      shift: string;
      entries: {
        courseId: string;
        day: string;
        startTime: string;
        endTime: string;
        room: string;
      }[];
    };

    if (!body.department || !body.semester || !body.shift || !Array.isArray(body.entries) || body.entries.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: department, semester, shift, and non-empty entries array are required" },
        { status: 400 }
      );
    }

    // Verify and fetch course details along with assigned faculty
    const courseIds = [...new Set(body.entries.map((e) => e.courseId))];
    let courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      include: {
        faculty: { include: { user: { select: { name: true } } } },
      },
    });

    // Handle unassigned faculty if needed
    const unassigned = courses.filter((c) => !c.assignedFaculty);
    if (unassigned.length > 0) {
      const defaultFaculty =
        (await prisma.faculty.findFirst({
          where: { department: body.department },
          select: { id: true },
        })) ?? (await prisma.faculty.findFirst({ select: { id: true } }));

      if (defaultFaculty) {
        await prisma.course.updateMany({
          where: { id: { in: unassigned.map((c) => c.id) } },
          data: { assignedFaculty: defaultFaculty.id },
        });

        // Refetch courses after assigning default faculty
        courses = await prisma.course.findMany({
          where: { id: { in: courseIds } },
          include: {
            faculty: { include: { user: { select: { name: true } } } },
          },
        });
      }
    }

    const courseMap = new Map(courses.map((c) => [c.id, c]));

    // 1. Internal Batch Payload Self-Conflict Check
    for (let i = 0; i < body.entries.length; i++) {
      for (let j = i + 1; j < body.entries.length; j++) {
        const e1 = body.entries[i];
        const e2 = body.entries[j];

        if (e1.day === e2.day && hasTimeOverlap(e1.startTime, e1.endTime, e2.startTime, e2.endTime)) {
          // Room conflict within payload
          if (e1.room.trim().toLowerCase() === e2.room.trim().toLowerCase()) {
            return NextResponse.json(
              {
                error: `Conflict in batch: Room "${e1.room}" is assigned to multiple overlapping lectures on ${e1.day} (${e1.startTime} - ${e1.endTime}).`,
              },
              { status: 409 }
            );
          }

          // Faculty conflict within payload
          const c1 = courseMap.get(e1.courseId);
          const c2 = courseMap.get(e2.courseId);
          if (c1?.assignedFaculty && c1.assignedFaculty === c2?.assignedFaculty) {
            const facultyName = c1.faculty?.user?.name || "Assigned Faculty";
            return NextResponse.json(
              {
                error: `Conflict in batch: Faculty member "${facultyName}" is scheduled for multiple overlapping lectures on ${e1.day} (${e1.startTime} - ${e1.endTime}).`,
              },
              { status: 409 }
            );
          }
        }
      }
    }

    // 2. Database Conflict Check against existing Timetable entries
    const days = [...new Set(body.entries.map((e) => e.day))];
    const existingEntries = await prisma.timetable.findMany({
      where: { shift: body.shift, day: { in: days } },
      include: {
        course: {
          include: {
            faculty: { include: { user: { select: { name: true } } } },
          },
        },
      },
    });

    for (const entry of body.entries) {
      const entryCourse = courseMap.get(entry.courseId);

      for (const exist of existingEntries) {
        if (
          exist.day === entry.day &&
          hasTimeOverlap(entry.startTime, entry.endTime, exist.startTime, exist.endTime)
        ) {
          // Room collision
          if (exist.room.trim().toLowerCase() === entry.room.trim().toLowerCase()) {
            return NextResponse.json(
              {
                error: `Room "${entry.room}" is already booked on ${entry.day} between ${exist.startTime} and ${exist.endTime} for course "${exist.course?.courseCode} - ${exist.course?.courseName}".`,
              },
              { status: 409 }
            );
          }

          // Faculty collision
          if (
            entryCourse?.assignedFaculty &&
            exist.course?.assignedFaculty === entryCourse.assignedFaculty
          ) {
            const facultyName = entryCourse.faculty?.user?.name || "Assigned Faculty";
            return NextResponse.json(
              {
                error: `Faculty member "${facultyName}" is already scheduled on ${entry.day} between ${exist.startTime} and ${exist.endTime} for course "${exist.course?.courseCode} - ${exist.course?.courseName}".`,
              },
              { status: 409 }
            );
          }
        }
      }
    }

    // Create all entries atomically
    const created = await prisma.$transaction(
      body.entries.map((entry) =>
        prisma.timetable.create({
          data: {
            shift: body.shift,
            courseId: entry.courseId,
            day: entry.day,
            startTime: entry.startTime,
            endTime: entry.endTime,
            room: entry.room,
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: created.length }, { status: 201 });
  } catch (error) {
    console.error("POST /api/timetable/batch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
