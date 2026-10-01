import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { FeedbackType, Prisma } from "@prisma/client";
import { ApiError, errorResponse, handleApiError, parseJsonBody } from "@/lib/api-errors";

interface FeedbackCreateBody {
  type: FeedbackType;
  targetId: string;
  rating: number;
  comment?: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateFeedbackBody(body: FeedbackCreateBody) {
  const validTypes = new Set<FeedbackType>(["Course", "Faculty"]);
  if (!validTypes.has(body.type)) {
    throw new ApiError("BAD_REQUEST", "type must be Course or Faculty", 400);
  }
  if (!isNonEmptyString(body.targetId)) {
    throw new ApiError("BAD_REQUEST", "targetId is required", 400);
  }
  if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    throw new ApiError("BAD_REQUEST", "rating must be an integer between 1 and 5", 400);
  }
  if (body.comment !== undefined && typeof body.comment !== "string") {
    throw new ApiError("BAD_REQUEST", "comment must be a string", 400);
  }
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    // Load user with role and associated records
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        role: true,
        student: { select: { id: true } },
        faculty: { select: { id: true } },
      },
    });

    if (!user) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

    const { searchParams } = request.nextUrl;
    const targetId = searchParams.get("targetId");
    const type = searchParams.get("type") as FeedbackType | null;
    const programLevel = searchParams.get("programLevel") || "BS";
    if (type && type !== "Course" && type !== "Faculty") {
      return errorResponse("BAD_REQUEST", "Invalid feedback type filter", 400);
    }

    // Build where clause with authorization checks
    const isAdmin = user.role === "ADMIN";
    const isFaculty = user.role === "FACULTY";

    // Admin and faculty can see feedback, students can only see their own
    let whereClause: Prisma.FeedbackWhereInput = {
      ...(targetId ? { targetId } : {}),
      ...(type ? { type } : {}),
      ...(isAdmin ? { student: { programLevel: programLevel === "INTERMEDIATE" ? "INTERMEDIATE" : "BS" } } : {}),
    };

    if (isFaculty) {
      if (!user.faculty) {
        return errorResponse("FORBIDDEN", "Forbidden: Faculty profile not found", 403);
      }
      whereClause = {
        ...whereClause,
        type: "Faculty",
        targetId: user.faculty.id,
      };
    } else if (!isAdmin) {
      // Students can only see their own feedback
      if (!user.student) {
        return errorResponse("FORBIDDEN", "Forbidden", 403);
      }
      whereClause = { ...whereClause, studentId: user.student.id };
    }

    const feedbacks = await prisma.feedback.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
    });

    const courseIds = feedbacks.filter((f) => f.type === "Course").map((f) => f.targetId);
    const facultyIds = feedbacks.filter((f) => f.type === "Faculty").map((f) => f.targetId);

    const [courses, faculties] = await Promise.all([
      prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, courseCode: true, courseName: true },
      }),
      prisma.faculty.findMany({
        where: { id: { in: facultyIds } },
        select: {
          id: true,
          user: { select: { name: true } },
        },
      }),
    ]);

    const courseMap = new Map(courses.map((c) => [c.id, `${c.courseCode} — ${c.courseName}`]));
    const facultyMap = new Map(faculties.map((f) => [f.id, f.user.name || "Unknown"]));

    const result = feedbacks.map((f) => ({
      id: f.id,
      type: f.type,
      targetId: f.targetId,
      targetName: f.type === "Course"
        ? (courseMap.get(f.targetId) || "Unknown Course")
        : (facultyMap.get(f.targetId) || "Unknown Faculty"),
      rating: f.rating,
      comment: f.comment,
      date: f.date.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError("GET /api/feedback", error);
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    const body = await parseJsonBody<FeedbackCreateBody>(request);
    validateFeedbackBody(body);

    // Resolve the student DB record from the authenticated Clerk user
    const student = await prisma.student.findFirst({
      where: { user: { clerkId: userId } },
      select: { id: true },
    });

    if (!student) {
      return errorResponse("FORBIDDEN", "Only students can submit feedback", 403);
    }

    // Duplicate prevention: check if already submitted for this target
    const existing = await prisma.feedback.findFirst({
      where: {
        studentId: student.id,
        targetId: body.targetId,
        type: body.type,
      },
    });

    if (existing) {
      return errorResponse(
        "BAD_REQUEST",
        "You have already submitted feedback for this target. You can only submit once per target.",
        400
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        studentId: student.id,
        type: body.type,
        targetId: body.targetId,
        rating: body.rating,
        comment: body.comment ?? "",
      },
    });

    let targetName = "Unknown";
    if (body.type === "Course") {
      const c = await prisma.course.findUnique({
        where: { id: body.targetId },
        select: { courseCode: true, courseName: true },
      });
      if (c) targetName = `${c.courseCode} — ${c.courseName}`;
    } else {
      const f = await prisma.faculty.findUnique({
        where: { id: body.targetId },
        select: { user: { select: { name: true } } },
      });
      if (f) targetName = f.user.name || "Unknown";
    }

    return NextResponse.json({
      id: feedback.id,
      type: feedback.type,
      targetId: feedback.targetId,
      targetName,
      rating: feedback.rating,
      comment: feedback.comment,
      date: feedback.date.toISOString(),
    }, { status: 201 });
  } catch (error) {
    return handleApiError("POST /api/feedback", error);
  }
}