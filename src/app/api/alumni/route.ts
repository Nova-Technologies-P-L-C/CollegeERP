import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");
    const programLevel = searchParams.get("programLevel") || "BS";
    const queryStr = searchParams.get("q")?.trim();

    const whereClause: Record<string, unknown> = {
      status: programLevel === "INTERMEDIATE" ? { in: ["HSSC Completed", "Graduated"] } : "Graduated",
      programLevel: programLevel === "INTERMEDIATE" ? "INTERMEDIATE" : "BS",
    };

    if (department && department !== "all") {
      whereClause.department = department;
    }

    if (queryStr) {
      whereClause.OR = [
        { rollNo: { contains: queryStr, mode: "insensitive" } },
        { user: { name: { contains: queryStr, mode: "insensitive" } } },
        { user: { email: { contains: queryStr, mode: "insensitive" } } },
        { department: { contains: queryStr, mode: "insensitive" } },
      ];
    }

    const alumniList = await prisma.student.findMany({
      where: whereClause,
      select: {
        id: true,
        rollNo: true,
        department: true,
        semester: true,
        status: true,
        cgpa: true,
        avatar: true,
        enrollmentDate: true,
        shift: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        enrollmentDate: "desc",
      },
    });

    const isInter = programLevel === "INTERMEDIATE";

    const formatted = alumniList.map((a) => {
      const startYear = a.enrollmentDate ? new Date(a.enrollmentDate).getFullYear() : 2024;
      const duration = isInter ? 2 : 4;
      const endYear = startYear + duration;
      const batchStr = `Batch ${startYear}-${String(endYear).slice(-2)}`;
      return {
        id: a.id,
        rollNo: a.rollNo,
        name: a.user?.name || (isInter ? "HSSC Graduate" : "Alumni"),
        email: a.user?.email || "",
        avatar: a.avatar || a.user?.avatar || null,
        department: a.department,
        graduationYear: endYear,
        batch: batchStr,
        cgpa: a.cgpa,
        shift: a.shift,
        status: a.status,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/alumni error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
