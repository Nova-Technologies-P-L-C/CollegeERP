import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApiError, errorResponse, handleApiError, parseJsonBody } from "@/lib/api-errors";

interface GradeCreateBody {
  studentId: string;
  courseId: string;
  quizMarks: number;
  assignmentMarks: number;
  midMarks: number;
  finalMarks: number;
  cgpa?: number;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateMarks(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new ApiError("BAD_REQUEST", `${field} must be a non-negative number`, 400);
  }
}

function validateGradeBody(body: GradeCreateBody) {
  if (!isNonEmptyString(body.studentId)) {
    throw new ApiError("BAD_REQUEST", "studentId is required", 400);
  }
  if (!isNonEmptyString(body.courseId)) {
    throw new ApiError("BAD_REQUEST", "courseId is required", 400);
  }

  validateMarks(body.quizMarks, "quizMarks");
  validateMarks(body.assignmentMarks, "assignmentMarks");
  validateMarks(body.midMarks, "midMarks");
  validateMarks(body.finalMarks, "finalMarks");
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    // Load user with role and faculty/student info
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        role: true,
        faculty: { select: { id: true } },
        student: { select: { id: true, semester: true } },
      },
    });

    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

    const { searchParams } = request.nextUrl;
    const courseId = searchParams.get("courseId");
    const studentId = searchParams.get("studentId");

    // Verify authorization
    const isAdmin = user.role === "ADMIN";
    const isFaculty = user.role === "FACULTY";

    if (!isAdmin && !isFaculty) {
      // Students can only see their own grades
      if (!user.student) {
        return errorResponse("FORBIDDEN", "Forbidden", 403);
      }
      if (studentId && studentId !== user.student.id) {
        return errorResponse("FORBIDDEN", "Forbidden", 403);
      }
    }

    // If faculty and courseId specified, verify they're assigned to it
    if (isFaculty && courseId && user.faculty) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { assignedFaculty: true },
      });
      if (!course || course.assignedFaculty !== user.faculty.id) {
        return errorResponse("FORBIDDEN", "Forbidden", 403);
      }
    }

    // If studentId is provided, ensure only authorized users can view
    if (studentId && !isAdmin && !isFaculty) {
      if (!user.student || user.student.id !== studentId) {
        return errorResponse("FORBIDDEN", "Forbidden", 403);
      }
    }

    // Auto-initialize Grade records for enrolled students who do not have one yet
    if (courseId) {
      try {
        const enrollments = await prisma.enrollment.findMany({
          where: { courseId },
          select: { studentId: true },
        });

        if (enrollments.length > 0) {
          const existingGrades = await prisma.grade.findMany({
            where: { courseId },
            select: { studentId: true },
          });

          const existingStudentIds = new Set(existingGrades.map((g) => g.studentId));
          const missingEnrollments = enrollments.filter(
            (e) => !existingStudentIds.has(e.studentId)
          );

          if (missingEnrollments.length > 0) {
            await prisma.grade.createMany({
              data: missingEnrollments.map((e) => ({
                studentId: e.studentId,
                courseId,
                quizMarks: 0,
                assignmentMarks: 0,
                midMarks: 0,
                finalMarks: 0,
                total: 0,
                gpa: 0,
              })),
            });
          }
        }
      } catch (initErr) {
        console.error("Failed to auto-initialize grades:", initErr);
      }
    }

    const grades = await prisma.grade.findMany({
      where: {
        ...(courseId ? { courseId } : {}),
        ...(studentId ? {
          studentId,
          ...(!isAdmin && !isFaculty && user.student ? {
            course: {
              semester: user.student.semester,
            },
          } : {}),
        } : {}),
        ...(!isAdmin && !isFaculty && user.student ? {
          studentId: user.student.id,
          course: {
            semester: user.student.semester,
          },
        } : {}),
      },
      select: {
        id: true,
        studentId: true,
        courseId: true,
        quizMarks: true,
        assignmentMarks: true,
        midMarks: true,
        finalMarks: true,
        total: true,
        gpa: true,
        locked: true,
        student: {
          select: {
            id: true,
            rollNo: true,
            user: { select: { name: true } },
          },
        },
        course: { select: { courseCode: true, courseName: true } },
      },
    });

    return NextResponse.json(grades);
  } catch (error) {
    return handleApiError("GET /api/grades", error);
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    // Check user role - only admin/faculty can create/update grades
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, faculty: { select: { id: true } } },
    });

    if (!user || !["ADMIN", "FACULTY"].includes(user.role)) {
      return errorResponse("FORBIDDEN", "Forbidden", 403);
    }

    const body = await parseJsonBody<GradeCreateBody>(request);
    validateGradeBody(body);

    // If faculty, verify they're assigned to the course
    if (user.role === "FACULTY" && user.faculty) {
      const course = await prisma.course.findUnique({
        where: { id: body.courseId },
        select: { assignedFaculty: true },
      });
      if (!course || course.assignedFaculty !== user.faculty.id) {
        return errorResponse("FORBIDDEN", "Forbidden", 403);
      }
    }

    const existing = await prisma.grade.findFirst({
      where: { studentId: body.studentId, courseId: body.courseId },
    });

    if (existing?.locked) {
      return errorResponse("FORBIDDEN", "Grade is locked", 403);
    }

    const total = body.quizMarks + body.assignmentMarks + body.midMarks + body.finalMarks;
    // Max marks: updated to 40 (25 mid + 15 sessional/final)
    const MAX_MARKS = 40;
    const gpa = +Math.min(4.0, (total / MAX_MARKS) * 4.0).toFixed(2);

    const data = {
      quizMarks: body.quizMarks,
      assignmentMarks: body.assignmentMarks,
      midMarks: body.midMarks,
      finalMarks: body.finalMarks,
      total,
      gpa,
    };

    // Update student's CGPA in parallel if provided
    if (body.cgpa !== undefined && typeof body.cgpa === "number") {
      await prisma.student.update({
        where: { id: body.studentId },
        data: { cgpa: body.cgpa },
      });
    }

    const grade = existing
      ? await prisma.grade.update({ where: { id: existing.id }, data })
      : await prisma.grade.create({
          data: {
            studentId: body.studentId,
            courseId: body.courseId,
            ...data,
          },
        });

    return NextResponse.json(grade, { status: existing ? 200 : 201 });
  } catch (error) {
    return handleApiError("POST /api/grades", error);
  }
}