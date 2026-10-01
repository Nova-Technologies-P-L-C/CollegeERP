import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true, faculty: { select: { id: true, department: true } } },
    });

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const quizId = searchParams.get("quizId");
    const courseId = searchParams.get("courseId");

    const whereClause: Prisma.QuestionWhereInput = {
      ...(courseId ? { courseId } : {}),
      ...(quizId ? { quizId } : {}),
    };

    // Faculty: strictly restrict to courses explicitly assigned to them
    if (user.role === "FACULTY" && user.faculty) {
      whereClause.course = {
        assignedFaculty: user.faculty.id,
      };
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
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
        quiz: { select: { title: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("GET /api/questions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, clerkId: true, faculty: { select: { id: true, department: true } } },
    });

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rawBody = await request.json();
    const isArray = Array.isArray(rawBody);
    const items = isArray ? rawBody : [rawBody];

    if (items.length === 0) {
      return NextResponse.json({ error: "Empty request payload" }, { status: 400 });
    }

    const createdQuestions = [];
    for (const body of items) {
      if (!body.courseId || !body.text) continue;

      const course = await prisma.course.findUnique({
        where: { id: body.courseId },
        select: { assignedFaculty: true, department: true },
      });

      if (!course) continue;

      const isAdmin = user.role === "ADMIN";
      // Faculty can only add questions to courses explicitly assigned to them
      const isFacultyAllowed =
        user.faculty && course.assignedFaculty === user.faculty.id;

      if (!isAdmin && !isFacultyAllowed) continue;

      const q = await prisma.question.create({
        data: {
          courseId: body.courseId,
          type: body.type ?? "MCQ",
          text: body.text,
          options: body.options ?? [],
          correctOption: body.correctOption ?? null,
          sampleAnswer: body.sampleAnswer ?? null,
          marks: body.marks ?? 1,
          quizId: body.quizId ?? null,
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
          createdAt: true,
        },
      });
      createdQuestions.push(q);
    }

    return NextResponse.json(isArray ? createdQuestions : createdQuestions[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/questions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}