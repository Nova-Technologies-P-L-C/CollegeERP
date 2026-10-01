import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: attemptId } = await params;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, student: { select: { id: true } } },
    });

    if (!user || user.role !== "STUDENT" || !user.student?.id) {
      return NextResponse.json({ error: "Forbidden: Student profile not found" }, { status: 403 });
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      select: { studentId: true },
    });

    if (!attempt || attempt.studentId !== user.student.id) {
      return NextResponse.json({ error: "Attempt record not found or access denied" }, { status: 404 });
    }

    await prisma.quizAttempt.delete({
      where: { id: attemptId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/quizzes/my-attempts/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
