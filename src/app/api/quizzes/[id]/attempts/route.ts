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
    const { id: quizId } = await params;

    // Load user role and faculty profile ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, faculty: { select: { id: true } } },
    });

    if (!user || !["ADMIN", "FACULTY"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load parent quiz details
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: { select: { assignedFaculty: true } } },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Verify authorization
    const isAdmin = user.role === "ADMIN";
    const isQuizCreator = quiz.createdBy === userId;
    const isFacultyAssignedToCourse =
      user.faculty && quiz.course?.assignedFaculty === user.faculty.id;

    if (!isAdmin && !isQuizCreator && !isFacultyAssignedToCourse) {
      return NextResponse.json({ error: "Forbidden: You do not have access to these results" }, { status: 403 });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      include: {
        student: {
          select: {
            rollNo: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json(attempts);
  } catch (error) {
    console.error("GET /api/quizzes/[id]/attempts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
