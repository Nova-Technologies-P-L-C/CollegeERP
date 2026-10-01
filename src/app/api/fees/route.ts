import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { FeeStatus } from "@prisma/client";
import { ApiError, errorResponse, handleApiError, parseJsonBody } from "@/lib/api-errors";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

interface FeeCreateBody {
  studentId?: string;
  type: string;
  amount: number;
  dueDate: string;
  semester: number;
  isBulk?: boolean;
  department?: string;
  shift?: string;
}

const FEE_STATUSES = new Set<FeeStatus>(["Paid", "Unpaid", "Overdue"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseValidDate(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError("BAD_REQUEST", `${fieldName} must be a valid date`, 400);
  }
  return date;
}

function validateFeeBody(body: FeeCreateBody) {
  if (body.isBulk) {
    if (!isNonEmptyString(body.department)) {
      throw new ApiError("BAD_REQUEST", "department is required for bulk creation", 400);
    }
    if (!isNonEmptyString(body.shift)) {
      throw new ApiError("BAD_REQUEST", "shift is required for bulk creation", 400);
    }
  } else {
    if (!isNonEmptyString(body.studentId)) {
      throw new ApiError("BAD_REQUEST", "studentId is required", 400);
    }
  }
  if (!isNonEmptyString(body.type)) {
    throw new ApiError("BAD_REQUEST", "type is required", 400);
  }
  if (!Number.isFinite(body.amount) || body.amount <= 0) {
    throw new ApiError("BAD_REQUEST", "amount must be greater than 0", 400);
  }
  if (!Number.isInteger(body.semester) || body.semester < 1) {
    throw new ApiError("BAD_REQUEST", "semester must be an integer >= 1", 400);
  }
  parseValidDate(body.dueDate, "dueDate");
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    // Load user with role and student info
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, student: { select: { id: true } } },
    });

    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

    const { searchParams } = request.nextUrl;
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status") as FeeStatus | null;
    if (status && !FEE_STATUSES.has(status)) {
      return errorResponse("BAD_REQUEST", "Invalid fee status filter", 400);
    }

    // Build where clause based on role
    const isAdmin = user.role === "ADMIN";
    const isFaculty = user.role === "FACULTY";

    if (isFaculty && !studentId) {
      return NextResponse.json([]);
    }

    const resolvedStudentId = studentId
      ? studentId
      : !isAdmin && !isFaculty
        ? user.student?.id
        : undefined;

    if (studentId) {
      // If specific studentId requested, verify permissions
      if (!isAdmin && !isFaculty) {
        // Students can only view their own fees
        if (!user.student || user.student.id !== studentId) {
          return errorResponse("FORBIDDEN", "Forbidden", 403);
        }
      }
    } else {
      // No studentId specified
      if (!isAdmin && !isFaculty) {
        // Students must filter by their own ID
        if (!user.student) {
          return errorResponse("FORBIDDEN", "Forbidden", 403);
        }
      }
    }

    const whereClause: { studentId?: string; status?: FeeStatus } = {
      ...(status ? { status } : {}),
      ...(resolvedStudentId ? { studentId: resolvedStudentId } : {}),
    };

    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");
    const limit = limitParam ? Math.min(Math.max(1, Number.parseInt(limitParam, 10)), 200) : undefined;
    const page = pageParam ? Math.max(1, Number.parseInt(pageParam, 10)) : 1;
    const skip = limit ? (page - 1) * limit : undefined;

    const fees = await prisma.fee.findMany({
      where: whereClause,
      select: {
        id: true,
        studentId: true,
        type: true,
        amount: true,
        status: true,
        dueDate: true,
        semester: true,
        paidDate: true,
        student: {
          select: {
            id: true,
            rollNo: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: "desc" },
      ...(limit ? { take: limit, skip } : {}),
    });

    return NextResponse.json(fees);
  } catch (error) {
    return handleApiError("GET /api/fees", error);
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    // Only admin can create fees
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return errorResponse("FORBIDDEN", "Only administrators can create fee records", 403);
    }

    const body = await parseJsonBody<FeeCreateBody>(request);
    validateFeeBody(body);
    const dueDate = parseValidDate(body.dueDate, "dueDate");

    if (body.isBulk) {
      // Find matching students
      const targetStudents = await prisma.student.findMany({
        where: {
          department: body.department!,
          semester: body.semester,
          shift: body.shift!,
          NOT: { status: "Graduated" },
        },
        select: {
          id: true,
          user: { select: { name: true } },
        },
      });

      if (targetStudents.length === 0) {
        return errorResponse("BAD_REQUEST", "No students found in the specified class/shift", 400);
      }

      const feeRecords = targetStudents.map((student) => ({
        studentId: student.id,
        type: body.type,
        amount: body.amount,
        dueDate,
        semester: body.semester,
        status: "Unpaid" as const,
      }));

      await prisma.fee.createMany({
        data: feeRecords,
      });

      try {
        const adminName = await getAdminName(userId);
        await logAuditAction({
          action: "CREATED",
          entity: "Fee",
          entityId: "bulk-create",
          description: `Bulk created ${body.type} of Rs. ${body.amount.toLocaleString()} for ${targetStudents.length} students in ${body.department} Semester ${body.semester} (${body.shift})`,
          adminClerkId: userId,
          adminName,
        });
      } catch (auditError) {
        console.error("Audit log failed:", auditError);
      }

      return NextResponse.json({ count: targetStudents.length }, { status: 201 });
    }

    const fee = await prisma.fee.create({
      data: {
        studentId: body.studentId!,
        type: body.type,
        amount: body.amount,
        dueDate,
        semester: body.semester,
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
      },
    });

    try {
      const adminName = await getAdminName(userId);
      await logAuditAction({
        action: "CREATED",
        entity: "Fee",
        entityId: fee.id,
        description: `Created ${body.type} of Rs. ${body.amount.toLocaleString()} for ${fee.student.user.name ?? "Unknown Student"}`,
        adminClerkId: userId,
        adminName,
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return NextResponse.json(fee, { status: 201 });
  } catch (error) {
    return handleApiError("POST /api/fees", error);
  }
}