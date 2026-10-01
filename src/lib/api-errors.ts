import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "INVALID_JSON"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: string;
  code: ApiErrorCode;
  details?: unknown;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: message,
      code,
      ...(details !== undefined ? { details } : {}),
    },
    { status }
  );
}

export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }
}

export function handleApiError(route: string, error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) {
    console.error("API error", {
      route,
      code: error.code,
      status: error.status,
      message: error.message,
      details: error.details,
    });
    return errorResponse(error.code, error.message, error.status, error.details);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return errorResponse("CONFLICT", "A record with these unique values already exists", 409);
    }
    if (error.code === "P2025") {
      return errorResponse("NOT_FOUND", "Requested record was not found", 404);
    }
  }

  const err = error as { code?: string; name?: string; message?: string } & Record<string, unknown>;
  const isDbUnavailable =
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    err?.code === "ECONNREFUSED" ||
    err?.code === "P2021" ||
    err?.message?.includes("does not exist") ||
    err?.message?.includes("connect") ||
    err?.message?.includes("ECONNREFUSED");

  if (isDbUnavailable) {
    console.error("Database error", { route, error });
    return errorResponse("DATABASE_ERROR", "Database temporarily unavailable", 503);
  }

  console.error("Unhandled API error", { route, error });
  return errorResponse("INTERNAL_ERROR", "Internal Server Error", 500);
}