import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logAuditAction } from "@/lib/audit-log";
import { getCachedUserRole } from "@/lib/auth-cache";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const role = await getCachedUserRole(userId);
    if (!role || !["ADMIN", "FACULTY"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");
    const programLevel = searchParams.get("programLevel") || "BS";
    const queryStr = searchParams.get("q")?.trim();

    const whereClause: Prisma.StudentWhereInput = {
      status: { in: ["Left", "Dropped Out", "Struck Off"] },
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

    const leftStudents = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        leftDate: "desc",
      },
    });

    const formatted = leftStudents.map((s) => ({
      id: s.id,
      rollNo: s.rollNo,
      name: s.user?.name || "Student",
      email: s.user?.email || "",
      avatar: s.avatar || s.user?.avatar || null,
      department: s.department,
      discipline: s.discipline,
      semester: s.semester,
      part: s.part,
      shift: s.shift,
      status: s.status,
      leftReason: s.leftReason || "Journey left midway",
      leftDate: s.leftDate ? s.leftDate.toISOString() : s.enrollmentDate.toISOString(),
      readmitRequested: s.readmitRequested,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/students/left error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, name: true },
    });

    if (!adminUser || adminUser.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, action, reason } = body;

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    if (action === "mark_left") {
      const updated = await prisma.student.update({
        where: { id: studentId },
        data: {
          status: "Left",
          leftReason: reason || "Left studies midway",
          leftDate: new Date(),
        },
        include: { user: { select: { name: true } } },
      });

      await logAuditAction({
        action: "UPDATED",
        entity: "Student",
        entityId: studentId,
        description: `Marked student ${updated.rollNo} (${updated.user?.name}) as Left/Dropped Out. Reason: ${reason || "N/A"}`,
        adminClerkId: userId,
        adminName: adminUser.name || "Admin",
      });

      return NextResponse.json(updated);
    } else if (action === "readmit") {
      const updated = await prisma.student.update({
        where: { id: studentId },
        data: {
          status: "Active",
          leftReason: null,
          readmitRequested: false,
        },
        include: { user: { select: { name: true } } },
      });

      await logAuditAction({
        action: "UPDATED",
        entity: "Student",
        entityId: studentId,
        description: `Readmitted student ${updated.rollNo} (${updated.user?.name}) back to Active status`,
        adminClerkId: userId,
        adminName: adminUser.name || "Admin",
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/students/left error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
