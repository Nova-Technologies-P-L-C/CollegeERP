import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      type?: "MCQ" | "Short" | "Long";
      text?: string;
      options?: string[];
      correctOption?: number | null;
      sampleAnswer?: string | null;
      marks?: number;
    };

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, clerkId: true, faculty: { select: { id: true, department: true } } },
    });

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        course: { select: { assignedFaculty: true, department: true } },
        quiz: { select: { createdBy: true } },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const isAdmin = user.role === "ADMIN";
    const isFacultyAllowed =
      user.faculty &&
      (question.course?.department === user.faculty.department ||
        question.course?.assignedFaculty === user.faculty.id);
    const isQuizCreator = question.quiz?.createdBy === user.clerkId;

    if (!isAdmin && !isFacultyAllowed && !isQuizCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.question.update({
      where: { id },
      data: {
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.text !== undefined ? { text: body.text } : {}),
        ...(body.options !== undefined ? { options: body.options } : {}),
        ...(body.correctOption !== undefined ? { correctOption: body.correctOption } : {}),
        ...(body.sampleAnswer !== undefined ? { sampleAnswer: body.sampleAnswer } : {}),
        ...(body.marks !== undefined ? { marks: body.marks } : {}),
      },
      select: {
        id: true,
        courseId: true,
        type: true,
        text: true,
        options: true,
        correctOption: true,
        sampleAnswer: true,
        marks: true,
        quizId: true,
        course: { select: { courseCode: true, courseName: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/questions/[id] error:", error);
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

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, clerkId: true, faculty: { select: { id: true, department: true } } },
    });

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        course: { select: { assignedFaculty: true, department: true } },
        quiz: { select: { createdBy: true } },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const isAdmin = user.role === "ADMIN";
    const isFacultyAllowed =
      user.faculty &&
      (question.course?.department === user.faculty.department ||
        question.course?.assignedFaculty === user.faculty.id);
    const isQuizCreator = question.quiz?.createdBy === user.clerkId;

    if (!isAdmin && !isFacultyAllowed && !isQuizCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.question.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/questions/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}