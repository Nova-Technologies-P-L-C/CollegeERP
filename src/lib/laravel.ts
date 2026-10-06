import prisma from "@/lib/prisma";

export function getLaravelApiUrl(): string {
  return process.env.LARAVEL_API_URL || "http://127.0.0.1:8000";
}

export async function fetchLaravelMe(token: string) {
  if (!token) return null;

  // 1. Instant direct database token resolution (sub-5ms, zero network deadlock)
  try {
    const [tokenId] = token.split("|");
    if (tokenId && !isNaN(Number(tokenId))) {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT tokenable_id FROM personal_access_tokens WHERE id = $1 LIMIT 1`,
        Number(tokenId)
      )) as Array<{ tokenable_id: string }>;

      if (rows && rows.length > 0) {
        const userId = rows[0].tokenable_id;
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            student: true,
            faculty: true,
            admin: true,
          },
        });

        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            student: user.student,
            faculty: user.faculty,
            admin: user.admin,
          };
        }
      }
    }
  } catch (dbErr) {
    console.error("Fast token resolution error:", dbErr);
  }

  // 2. HTTP Fallback to Laravel with strict 2.5s timeout
  const primaryUrl = getLaravelApiUrl();
  try {
    const res = await fetch(`${primaryUrl}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // If primary port (8000) failed, attempt fallback to 8001 if user started it there
    if (primaryUrl.includes(":8000")) {
      try {
        const fallbackRes = await fetch("http://127.0.0.1:8001/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(2500),
        });
        if (fallbackRes.ok) {
          return await fallbackRes.json();
        }
      } catch {}
    }
  }

  return null;
}
