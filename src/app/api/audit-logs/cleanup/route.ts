import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // Check authorization header for CRON secret if using Vercel CRON
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Redact sensitive data from expired logs
    // We are setting adminName and description to [REDACTED] to preserve the action history but remove PII
    const result = await prisma.auditLog.updateMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
        description: {
          not: "[REDACTED]",
        },
      },
      data: {
        adminName: "[REDACTED]",
        description: "[REDACTED]",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully redacted ${result.count} expired audit logs.`,
    });
  } catch (error) {
    console.error("Failed to cleanup audit logs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
