import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { errorResponse, handleApiError } from "@/lib/api-errors";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        student: true,
        faculty: true,
        admin: true,
      },
    });

    if (!user) return errorResponse("NOT_FOUND", "User not found", 404);

    let studentData = user.student;
    if (
      studentData &&
      studentData.programLevel === "INTERMEDIATE" &&
      (studentData.obtainedMarks === null || studentData.obtainedMarks === undefined) &&
      user.email
    ) {
      const adm = await prisma.admission.findFirst({
        where: { email: user.email },
        select: { marksObtained: true, totalMarks: true },
      });
      if (adm && adm.marksObtained) {
        const obtained = Math.round(adm.marksObtained);
        const total = adm.totalMarks ? Math.round(adm.totalMarks) : 1100;
        studentData = { ...studentData, obtainedMarks: obtained, totalMarks: total };
      }
    }

    return NextResponse.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      student: studentData,
      faculty: user.faculty,
      admin: user.admin,
    });
  } catch (error) {
    return handleApiError("GET /api/me", error);
  }
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    const body = (await request.json()) as { name?: string; phone?: string; avatar?: string };
    const { name, phone, avatar } = body;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { student: true, faculty: true },
    });

    if (!user) return errorResponse("NOT_FOUND", "User not found", 404);

    // Update base user name and avatar
    const updated = await prisma.user.update({
      where: { clerkId: userId },
      data: { 
        ...(name !== undefined ? { name } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
      },
    });

    // Propagate phone to role-specific profile
    if (phone !== undefined) {
      if (user.student) {
        await prisma.student.update({
          where: { userId: user.id },
          data: { phone },
        });
      } else if (user.faculty) {
        await prisma.faculty.update({
          where: { userId: user.id },
          data: { phone },
        });
      }
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      avatar: updated.avatar,
    });
  } catch (error) {
    return handleApiError("PATCH /api/me", error);
  }
}
