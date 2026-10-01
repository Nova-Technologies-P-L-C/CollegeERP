import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-errors";

function generateSecretKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GGC-${result}`;
}

export async function GET() {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    const dbSettings = await prisma.systemSettings.findUnique({
      where: { key: "admin_onboarding_secret" },
    });

    const dbExpiresAt = await prisma.systemSettings.findUnique({
      where: { key: "admin_onboarding_secret_expires_at" },
    });

    if (!dbSettings || !dbSettings.value) {
      return NextResponse.json({ secret: "" });
    }

    const now = Date.now();
    const expiresAtTime = dbExpiresAt?.value ? new Date(dbExpiresAt.value).getTime() : new Date(dbSettings.updatedAt).getTime() + 60 * 60 * 1000;

    if (now >= expiresAtTime) {
      return NextResponse.json({ secret: "" });
    }

    return NextResponse.json({
      secret: dbSettings.value,
      expiresAt: new Date(expiresAtTime).toISOString(),
    });
  } catch (error) {
    return handleApiError("GET /api/settings/admin-secret", error);
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    let expiryHours = 1;
    try {
      const body = await request.json();
      if (body && typeof body.expiryHours === "number" && body.expiryHours > 0) {
        expiryHours = body.expiryHours;
      }
    } catch {
      // Default to 1 hour
    }

    const generatedSecret = generateSecretKey();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    const settings = await prisma.systemSettings.upsert({
      where: { key: "admin_onboarding_secret" },
      update: { value: generatedSecret, updatedAt: now },
      create: { key: "admin_onboarding_secret", value: generatedSecret },
    });

    await prisma.systemSettings.upsert({
      where: { key: "admin_onboarding_secret_expires_at" },
      update: { value: expiresAt.toISOString(), updatedAt: now },
      create: { key: "admin_onboarding_secret_expires_at", value: expiresAt.toISOString() },
    });

    return NextResponse.json({
      success: true,
      secret: settings.value,
      expiresAt: expiresAt.toISOString(),
      expiryHours,
    });
  } catch (error) {
    return handleApiError("POST /api/settings/admin-secret", error);
  }
}
