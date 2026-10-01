import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { errorResponse, handleApiError } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);

  try {
    const { searchParams } = request.nextUrl;
    const shift = searchParams.get("shift") || "Morning";

    if (shift !== "Morning" && shift !== "Evening") {
      return errorResponse("BAD_REQUEST", "Invalid shift filter", 400);
    }

    let settings = await prisma.timetableSettings.findUnique({
      where: { shift },
    });

    // Fallback/Default values if not created in DB yet
    if (!settings) {
      settings = {
        id: "",
        shift,
        startTime: shift === "Morning" ? "07:45" : "12:00",
        duration: 45,
        slots: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError("GET /api/timetable/settings", error);
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      shift: string;
      startTime: string;
      duration: number;
      slots: number;
    };

    const { shift, startTime, duration, slots } = body;

    if (!shift || (shift !== "Morning" && shift !== "Evening")) {
      return errorResponse("BAD_REQUEST", "shift must be Morning or Evening", 400);
    }

    if (!startTime || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
      return errorResponse("BAD_REQUEST", "startTime must be in HH:mm format", 400);
    }

    if (typeof duration !== "number" || duration <= 0) {
      return errorResponse("BAD_REQUEST", "duration must be a positive number of minutes", 400);
    }

    if (typeof slots !== "number" || slots <= 0 || slots > 20) {
      return errorResponse("BAD_REQUEST", "slots count must be a positive integer between 1 and 20", 400);
    }

    const settings = await prisma.timetableSettings.upsert({
      where: { shift },
      update: {
        startTime,
        duration,
        slots,
      },
      create: {
        shift,
        startTime,
        duration,
        slots,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError("POST /api/timetable/settings", error);
  }
}
