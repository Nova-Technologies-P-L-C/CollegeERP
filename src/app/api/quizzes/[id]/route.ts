import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          select: {
            id: true,
            text: true,
            options: true,
            correctOption: true,
            quizId: true,
          },
        },
        course: { select: { courseCode: true, courseName: true } },
      },
    });

    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    // Enforce authorization for student users
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, student: { select: { id: true } } },
    });

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role === "STUDENT") {
      if (!user.student) {
        return NextResponse.json({ error: "Forbidden: Student profile not found" }, { status: 403 });
      }
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: user.student.id,
          courseId: quiz.courseId,
        },
      });
      if (!enrollment) {
        return NextResponse.json({ error: "Forbidden: Not enrolled in this course" }, { status: 403 });
      }
    }

    return NextResponse.json(quiz);
  } catch (error) {
    console.error("GET /api/quizzes/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      title?: string;
      status?: string;
      duration?: number;
      totalMarks?: number;
      dueDate?: string;
    };

    // Load user role and faculty info
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, clerkId: true, faculty: { select: { id: true, department: true } } },
    });

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Load quiz with course info
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { course: { select: { assignedFaculty: true, department: true } } },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Verify authorization: admin or faculty in same dept/assigned or quiz creator
    const isAdmin = user.role === "ADMIN";
    const isFacultyAllowed =
      user.faculty &&
      (quiz.course?.department === user.faculty.department ||
        quiz.course?.assignedFaculty === user.faculty.id);
    const isQuizCreator = quiz.createdBy === user.clerkId;

    if (!isAdmin && !isFacultyAllowed && !isQuizCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.quiz.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.duration !== undefined ? { duration: body.duration } : {}),
        ...(body.totalMarks !== undefined ? { totalMarks: body.totalMarks } : {}),
        ...(body.dueDate !== undefined ? { dueDate: new Date(body.dueDate) } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/quizzes/[id] error:", error);
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
    const { id } = await params;

    // Load user role and faculty info
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, clerkId: true, faculty: { select: { id: true, department: true } } },
    });

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Load quiz with course info
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { course: { select: { assignedFaculty: true, department: true } } },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Verify authorization: admin or faculty in same dept/assigned or quiz creator
    const isAdmin = user.role === "ADMIN";
    const isFacultyAllowed =
      user.faculty &&
      (quiz.course?.department === user.faculty.department ||
        quiz.course?.assignedFaculty === user.faculty.id);
    const isQuizCreator = quiz.createdBy === user.clerkId;

    if (!isAdmin && !isFacultyAllowed && !isQuizCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.quiz.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/quizzes/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}