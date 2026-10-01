import { cache } from "react";
import prisma from "@/lib/prisma";

type UserRole = "ADMIN" | "FACULTY" | "STUDENT";

// In-memory short-lived cache for fast API route / server action lookup
const roleMemoryCache = new Map<string, { role: UserRole; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Fast cached user role lookup with short-lived memory caching.
 * Resolves repeated auth checks in 0ms without hitting PostgreSQL every time.
 */
export const getCachedUserRole = async (clerkId: string): Promise<UserRole | null> => {
  const cached = roleMemoryCache.get(clerkId);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.role;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });

  if (!user) return null;

  const role = user.role as UserRole;
  roleMemoryCache.set(clerkId, { role, timestamp: now });
  return role;
};

/**
 * Invalidate cached role when user is updated or promoted.
 */
export const invalidateUserRoleCache = (clerkId: string): void => {
  roleMemoryCache.delete(clerkId);
};

/**
 * React request-scoped cache for deduplication within a single React Server Component tree.
 */
export const getRequestCachedUser = cache(async (clerkId: string) => {
  return prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      role: true,
      clerkId: true,
      email: true,
      name: true,
      faculty: { select: { id: true, department: true } },
      student: {
        select: {
          id: true,
          semester: true,
          department: true,
          status: true,
          programLevel: true,
        },
      },
    },
  });
});
