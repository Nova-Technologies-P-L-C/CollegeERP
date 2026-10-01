import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCachedUserRole } from "@/lib/auth-cache";

type UserRole = "ADMIN" | "FACULTY" | "STUDENT";

/**
 * Verifies the authenticated user has the required role.
 * Returns an error NextResponse if unauthorized, or null if the check passes.
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<NextResponse | null> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isDbDown = (globalThis as unknown as { isDbDown?: boolean }).isDbDown;
  if (isDbDown) {
    return NextResponse.json({ error: "Database temporarily unavailable", code: "DATABASE_ERROR" }, { status: 503 });
  }

  let role: UserRole | null = null;
  try {
    role = await getCachedUserRole(userId);
  } catch {
    return NextResponse.json({ error: "Database temporarily unavailable", code: "DATABASE_ERROR" }, { status: 503 });
  }

  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

/**
 * Allows access if the current user is the resource owner (by clerkId match)
 * OR has one of the allowed roles (e.g. ADMIN).
 * Returns { error: NextResponse } if unauthorized, or { userId, role } if permitted.
 */
export async function requireOwnerOrRole(
  ownerClerkId: string,
  allowedRoles: UserRole[]
): Promise<{ error: NextResponse } | { userId: string; role: UserRole }> {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const isDbDown = (globalThis as unknown as { isDbDown?: boolean }).isDbDown;
  if (isDbDown) {
    return { error: NextResponse.json({ error: "Database temporarily unavailable", code: "DATABASE_ERROR" }, { status: 503 }) };
  }

  let role: UserRole = "STUDENT";
  try {
    const cachedRole = await getCachedUserRole(userId);
    if (cachedRole) role = cachedRole;
  } catch {
    return { error: NextResponse.json({ error: "Database temporarily unavailable", code: "DATABASE_ERROR" }, { status: 503 }) };
  }

  // Owner always has access
  if (userId === ownerClerkId) {
    return { userId, role };
  }

  if (!allowedRoles.includes(role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { userId, role };
}
