import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: quizId } = await params;
    const body = (await request.json()) as {
      answers?: Array<{ questionId: string; selectedOption: number }> | Record<string, number> | number[];
      studentId?: string;
      score?: number;
    };

    // Load user role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true, student: { select: { id: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: { orderBy: { id: "asc" } },
        course: { select: { courseCode: true } },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    let targetStudentId = user.student?.id;

    // Faculty marking hardform submission for a student
    if (user.role === "FACULTY" || user.role === "ADMIN") {
      if (!body.studentId) {
        return NextResponse.json({ error: "studentId is required for faculty submit" }, { status: 400 });
      }
      targetStudentId = body.studentId;
    }

    if (!targetStudentId) {
      return NextResponse.json({ error: "Forbidden: Student profile not found" }, { status: 403 });
    }

    let calculatedScore = body.score ?? 0;
    let numericAnswersArray: number[] = [];

    if (body.answers && quiz.questions.length > 0) {
      let earnedMarks = 0;
      const defaultMarksPerQ = quiz.totalMarks / quiz.questions.length;

      // Case 1: Array of { questionId, selectedOption }
      if (Array.isArray(body.answers) && typeof body.answers[0] === "object" && body.answers[0] !== null) {
        const answerList = body.answers as Array<{ questionId: string; selectedOption: number }>;
        const answerMap = new Map(answerList.map((a) => [a.questionId, a.selectedOption]));

        quiz.questions.forEach((q) => {
          const selected = answerMap.get(q.id);
          if (selected !== undefined && selected === q.correctOption) {
            earnedMarks += q.marks || defaultMarksPerQ;
          }
        });
        calculatedScore = Math.round(earnedMarks);
        numericAnswersArray = answerList.map((a) => a.selectedOption);
      }
      // Case 2: Object key-value map { [questionId]: selectedOption }
      else if (typeof body.answers === "object" && !Array.isArray(body.answers)) {
        const answerMap = body.answers as Record<string, number>;
        quiz.questions.forEach((q) => {
          const selected = answerMap[q.id];
          if (selected !== undefined && selected === q.correctOption) {
            earnedMarks += q.marks || defaultMarksPerQ;
          }
        });
        calculatedScore = Math.round(earnedMarks);
        numericAnswersArray = Object.values(answerMap);
      }
      // Case 3: Positional array of numbers [0, 1, 2]
      else if (Array.isArray(body.answers)) {
        const numAnswers = body.answers as number[];
        quiz.questions.forEach((q, i) => {
          if (numAnswers[i] !== undefined && numAnswers[i] === q.correctOption) {
            earnedMarks += q.marks || defaultMarksPerQ;
          }
        });
        calculatedScore = Math.round(earnedMarks);
        numericAnswersArray = numAnswers;
      }
    }

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId: targetStudentId,
        score: calculatedScore,
        totalMarks: quiz.totalMarks,
        answers: numericAnswersArray,
        quizTitle: quiz.title,
        courseCode: quiz.course?.courseCode ?? null,
      },
    });

    return NextResponse.json(attempt, { status: 201 });
  } catch (error) {
    console.error("POST /api/quizzes/[id]/submit error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: quizId } = await params;
    const { searchParams } = request.nextUrl;
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId parameter is required" }, { status: 400 });
    }

    await prisma.quizAttempt.deleteMany({
      where: {
        quizId,
        studentId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/quizzes/[id]/submit error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
