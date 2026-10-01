import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma, ProgramLevel } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Load user role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true },
    });

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only admin and faculty can list students
    if (!["ADMIN", "FACULTY"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const programLevelParam = searchParams.get("programLevel");
    const department = searchParams.get("department");
    const semester = searchParams.get("semester");
    const discipline = searchParams.get("discipline");
    const part = searchParams.get("part");
    const search = searchParams.get("search");
    const courseId = searchParams.get("courseId");

    let faculty = null;
    if (user.role === "FACULTY") {
      faculty = await prisma.faculty.findUnique({
        where: { userId: user.id },
      });
    }

    const includeGraduated = searchParams.get("includeGraduated") === "true";

    const whereClause: Prisma.StudentWhereInput = {
      ...(includeGraduated ? {} : { NOT: { status: "Graduated" } }),
      ...(programLevelParam ? { programLevel: programLevelParam as ProgramLevel } : {}),
      ...(department ? { department } : {}),
      ...(semester ? { semester: Number(semester) } : {}),
      ...(discipline ? { discipline } : {}),
      ...(part ? { part: Number(part) } : {}),
      ...(search
        ? {
            OR: [
              { user: { name: { contains: search, mode: "insensitive" } } },
              { user: { email: { contains: search, mode: "insensitive" } } },
              { rollNo: { contains: search, mode: "insensitive" } },
              { department: { contains: search, mode: "insensitive" } },
              { discipline: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(courseId ? { enrollments: { some: { courseId } } } : {}),
      ...(user.role === "FACULTY" && faculty
        ? {
            OR: [
              { department: faculty.department },
              { enrollments: { some: { course: { assignedFaculty: faculty.id } } } },
            ],
          }
        : {}),
    };

    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");
    const limit = limitParam ? Math.min(Math.max(1, Number.parseInt(limitParam, 10)), 200) : undefined;
    const page = pageParam ? Math.max(1, Number.parseInt(pageParam, 10)) : 1;
    const skip = limit ? (page - 1) * limit : undefined;

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true } },
        enrollments: { select: { id: true, courseId: true, blocked: true, readmitRequested: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { rollNo: "asc" },
      ...(limit ? { take: limit, skip } : {}),
    });

    const result = students.map((s) => ({
      id: s.id,
      userId: s.userId,
      rollNo: s.rollNo,
      phone: s.phone,
      programLevel: s.programLevel,
      department: s.department,
      semester: s.semester,
      discipline: s.discipline,
      part: s.part,
      shift: s.shift,
      blocked: s.blocked,
      readmitRequested: s.readmitRequested,
      enrollmentDate: s.enrollmentDate.toISOString(),
      avatar: s.avatar,
      approvedBy: s.approvedBy,
      user: {
        name: s.user.name,
        email: s.user.email,
      },
      enrollments: s.enrollments,
      _count: {
        enrollments: s._count.enrollments,
      },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/students error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Load authenticated user role
    const authUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, id: true },
    });

    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only admin can create student records
    if (authUser.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      userId: string;
      rollNo: string;
      phone?: string;
      programLevel?: "BS" | "INTERMEDIATE";
      department?: string | null;
      semester?: number | null;
      discipline?: string | null;
      part?: number | null;
      shift?: string;
    };

    const programLevel = body.programLevel || "BS";

    if (programLevel === "BS") {
      if (!body.department) {
        return NextResponse.json({ error: "BS Department is required" }, { status: 400 });
      }
      if (!body.semester || body.semester < 1 || body.semester > 8) {
        return NextResponse.json({ error: "BS Semester must be between 1 and 8" }, { status: 400 });
      }
      if (body.discipline != null || body.part != null) {
        return NextResponse.json({ error: "Intermediate fields are not allowed for BS students" }, { status: 400 });
      }
    } else if (programLevel === "INTERMEDIATE") {
      if (!body.discipline) {
        return NextResponse.json({ error: "Intermediate Discipline is required" }, { status: 400 });
      }
      if (body.part !== 1 && body.part !== 2) {
        return NextResponse.json({ error: "Intermediate Part must be 1 (Part 1) or 2 (Part 2)" }, { status: 400 });
      }
      if (body.department != null || body.semester != null) {
        return NextResponse.json({ error: "BS fields are not allowed for Intermediate students" }, { status: 400 });
      }
    }

    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.role?.toUpperCase() !== "STUDENT")
      return NextResponse.json({ error: "User is not a STUDENT" }, { status: 400 });

    const student = await prisma.student.create({
      data: {
        userId: body.userId,
        rollNo: body.rollNo,
        phone: body.phone,
        programLevel,
        department: body.department || body.discipline || "Intermediate",
        semester: body.semester ?? body.part ?? 1,
        discipline: programLevel === "INTERMEDIATE" ? body.discipline : null,
        part: programLevel === "INTERMEDIATE" ? body.part : null,
        shift: body.shift || "Morning",
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A student with this roll number already exists" },
        { status: 409 }
      );
    }
    console.error("POST /api/students error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}