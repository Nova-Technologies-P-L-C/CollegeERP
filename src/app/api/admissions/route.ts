import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ProgramLevel } from "@prisma/client";
import { ApiError, errorResponse, handleApiError, parseJsonBody } from "@/lib/api-errors";

const ADMISSION_STATUSES = ["Pending", "Approved", "Rejected"] as const;

interface AdmissionCreateBody {
  studentName: string;
  email: string;
  phone: string;
  programLevel?: "BS" | "INTERMEDIATE";
  appliedDepartment?: string;
  discipline?: string;
  fatherName: string;
  cnic: string;
  previousInstitution: string;
  marksObtained: number;
  totalMarks: number;
  shift: string;
  semester?: number;
  part?: number;
  selectedCourses: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateAdmissionBody(body: AdmissionCreateBody) {
  if (!isNonEmptyString(body.studentName)) {
    throw new ApiError("BAD_REQUEST", "studentName is required", 400);
  }
  if (!isNonEmptyString(body.email)) {
    throw new ApiError("BAD_REQUEST", "email is required", 400);
  }
  if (!isNonEmptyString(body.phone)) {
    throw new ApiError("BAD_REQUEST", "phone is required", 400);
  }

  const level = body.programLevel || "BS";
  if (level === "BS") {
    if (!isNonEmptyString(body.appliedDepartment)) {
      throw new ApiError("BAD_REQUEST", "appliedDepartment is required for BS admissions", 400);
    }
    if (!Number.isInteger(body.semester) || (body.semester && (body.semester < 1 || body.semester > 8))) {
      throw new ApiError("BAD_REQUEST", "semester must be an integer between 1 and 8", 400);
    }
  } else if (level === "INTERMEDIATE") {
    if (!isNonEmptyString(body.discipline)) {
      throw new ApiError("BAD_REQUEST", "discipline is required for Intermediate admissions", 400);
    }
    if (body.part !== 1 && body.part !== 2) {
      throw new ApiError("BAD_REQUEST", "part must be 1 or 2 for Intermediate admissions", 400);
    }
  }

  if (!isNonEmptyString(body.fatherName)) {
    throw new ApiError("BAD_REQUEST", "fatherName is required", 400);
  }
  if (!isNonEmptyString(body.cnic)) {
    throw new ApiError("BAD_REQUEST", "cnic is required", 400);
  }
  if (!isNonEmptyString(body.previousInstitution)) {
    throw new ApiError("BAD_REQUEST", "previousInstitution is required", 400);
  }
  if (!Number.isFinite(body.marksObtained) || body.marksObtained < 0) {
    throw new ApiError("BAD_REQUEST", "marksObtained must be a non-negative number", 400);
  }
  if (!Number.isFinite(body.totalMarks) || body.totalMarks <= 0) {
    throw new ApiError("BAD_REQUEST", "totalMarks must be greater than 0", 400);
  }
  if (body.marksObtained > body.totalMarks) {
    throw new ApiError("BAD_REQUEST", "marksObtained cannot exceed totalMarks", 400);
  }
  if (!Array.isArray(body.selectedCourses) || !body.selectedCourses.every(item => typeof item === "string")) {
    throw new ApiError("BAD_REQUEST", "selectedCourses must be an array of strings", 400);
  }
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    // Check user role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (!user || !["ADMIN", "FACULTY"].includes(user.role)) {
      return errorResponse("FORBIDDEN", "Forbidden", 403);
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const programLevel = searchParams.get("programLevel");
    if (status && !ADMISSION_STATUSES.includes(status as (typeof ADMISSION_STATUSES)[number])) {
      return errorResponse("BAD_REQUEST", "Invalid status filter", 400);
    }

    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
    if (!Number.isFinite(page) || page < 1 || !Number.isFinite(limit) || limit < 1 || limit > 100) {
      return errorResponse("BAD_REQUEST", "page must be >= 1 and limit must be between 1 and 100", 400);
    }

    const skip = (page - 1) * limit;

    const admissions = await prisma.admission.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(programLevel ? { programLevel: programLevel as ProgramLevel } : {}),
      },
      orderBy: { applicationDate: "desc" },
      select: {
        id: true,
        studentName: true,
        email: true,
        phone: true,
        programLevel: true,
        appliedDepartment: true,
        discipline: true,
        applicationDate: true,
        status: true,
        previousInstitution: true,
        marksObtained: true,
        totalMarks: true,
        fatherName: true,
        cnic: true,
        shift: true,
        semester: true,
        part: true,
        selectedCourses: true,
      },
      skip,
      take: limit,
    });

    return NextResponse.json(admissions);
  } catch (error) {
    return handleApiError("GET /api/admissions", error);
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    const adminsCount = await prisma.user.count({
      where: { role: "ADMIN" },
    });
    if (adminsCount === 0) {
      return errorResponse(
        "BAD_REQUEST",
        "Registration is currently disabled because no system administrators are registered. Please try again later.",
        400
      );
    }

    const body = await parseJsonBody<AdmissionCreateBody>(request);
    validateAdmissionBody(body);

    const programLevel = body.programLevel || "BS";

    // --- Attempt Limiting ---
    // 1. Check if student is blocked (2+ rejections)
    const blockedAdmission = await prisma.admission.findFirst({
      where: { email: body.email, blocked: true },
    });
    if (blockedAdmission) {
      return errorResponse(
        "FORBIDDEN",
        "Your account has been blocked after multiple rejected applications. Please contact the admin office to request reactivation.",
        403
      );
    }

    // 2. Prevent duplicate submissions — cannot submit if a Pending one exists
    const pendingAdmission = await prisma.admission.findFirst({
      where: { email: body.email, status: "Pending" },
    });
    if (pendingAdmission) {
      return errorResponse(
        "BAD_REQUEST",
        "You already have a pending admission application. Please wait for admin review.",
        400
      );
    }

    // 3. Count rejected admissions to warn / enforce limit
    const rejectedCount = await prisma.admission.count({
      where: { email: body.email, status: "Rejected" },
    });
    if (rejectedCount >= 2) {
      return errorResponse(
        "FORBIDDEN",
        "Your account has been blocked after 2 rejected applications. Please contact the admin office.",
        403
      );
    }

    const admission = await prisma.admission.create({
      data: {
        studentName: body.studentName,
        email: body.email,
        phone: body.phone,
        programLevel,
        appliedDepartment: body.appliedDepartment || body.discipline || "Intermediate",
        discipline: programLevel === "INTERMEDIATE" ? body.discipline : null,
        fatherName: body.fatherName,
        cnic: body.cnic,
        previousInstitution: body.previousInstitution,
        marksObtained: body.marksObtained,
        totalMarks: body.totalMarks,
        shift: body.shift || "Morning",
        semester: body.semester ?? body.part ?? 1,
        part: programLevel === "INTERMEDIATE" ? body.part : null,
        selectedCourses: body.selectedCourses || [],
      },
    });

    return NextResponse.json(admission, { status: 201 });
  } catch (error) {
    return handleApiError("POST /api/admissions", error);
  }
}