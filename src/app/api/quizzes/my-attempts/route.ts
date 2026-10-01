import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, student: { select: { id: true } } },
    });

    if (!user || user.role !== "STUDENT" || !user.student?.id) {
      return NextResponse.json({ error: "Forbidden: Student profile not found" }, { status: 403 });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { studentId: user.student.id },
      include: {
        quiz: {
          include: {
            course: { select: { courseCode: true, courseName: true } },
            _count: { select: { questions: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const formatted = attempts.map((a) => ({
      ...a,
      quiz: a.quiz ?? {
        title: a.quizTitle ?? "Completed Quiz",
        duration: 0,
        totalMarks: a.totalMarks,
        course: { courseCode: a.courseCode ?? "N/A", courseName: "Course" },
        _count: { questions: 0 },
      },
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/quizzes/my-attempts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
