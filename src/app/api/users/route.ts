import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { errorResponse, handleApiError } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
  let role = typeof metadata?.role === "string" ? metadata.role.toUpperCase() : undefined;

  if (!role) {
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });
    role = dbUser?.role;
  }

  if (role !== "ADMIN") {
    return errorResponse("FORBIDDEN", "Admin access required", 403);
  }

  try {
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");
    const departmentFilter = searchParams.get("department");
    const semesterFilter = searchParams.get("semester");
    const programLevel = searchParams.get("programLevel") || "BS";
    const search = searchParams.get("search") ?? "";

    const targetLevel = programLevel === "INTERMEDIATE" ? "INTERMEDIATE" : "BS";
    const whereClause: Record<string, unknown> = {
      NOT: {
        student: {
          status: "Graduated",
        },
      },
      OR: [
        { student: { programLevel: targetLevel } },
        { faculty: { isNot: null } },
        { admin: { isNot: null } },
      ],
    };

    if (roleFilter && roleFilter !== "ALL") {
      whereClause.role = roleFilter as "ADMIN" | "FACULTY" | "STUDENT";
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { student: { rollNo: { contains: search, mode: "insensitive" } } },
        { student: { department: { contains: search, mode: "insensitive" } } },
        { faculty: { department: { contains: search, mode: "insensitive" } } },
        { faculty: { specialization: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (departmentFilter && departmentFilter !== "ALL") {
      whereClause.AND = [
        ...(whereClause.AND as unknown[] ?? []),
        {
          OR: [
            { student: { department: { equals: departmentFilter, mode: "insensitive" } } },
            { faculty: { department: { equals: departmentFilter, mode: "insensitive" } } },
          ],
        },
      ];
    }

    if (semesterFilter && semesterFilter !== "ALL") {
      const semNum = parseInt(semesterFilter, 10);
      if (!isNaN(semNum)) {
        whereClause.AND = [
          ...(whereClause.AND as unknown[] ?? []),
          { student: { semester: semNum } },
        ];
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        student: { select: { rollNo: true, department: true, semester: true, approvedBy: true, enrollmentDate: true } },
        faculty: { select: { phone: true, department: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        clerkId: u.clerkId,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        student: u.student
          ? {
              rollNo: u.student.rollNo,
              department: u.student.department,
              semester: u.student.semester,
              approvedBy: u.student.approvedBy ?? "System Admin",
              enrollmentDate: u.student.enrollmentDate ? u.student.enrollmentDate.toISOString() : u.createdAt.toISOString(),
            }
          : null,
        faculty: u.faculty
          ? { department: u.faculty.department }
          : null,
      }))
    );
  } catch (error) {
    return handleApiError("GET /api/users", error);
  }
}
