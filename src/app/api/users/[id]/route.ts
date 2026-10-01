import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

type AllowedRole = "ADMIN" | "FACULTY" | "STUDENT";
const ALLOWED_ROLES: AllowedRole[] = ["ADMIN", "FACULTY", "STUDENT"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    const { userId: adminClerkId } = await auth();
    if (!adminClerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as { role?: string };
    const newRole = body.role?.toUpperCase() as AllowedRole | undefined;

    if (!newRole || !ALLOWED_ROLES.includes(newRole)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN, FACULTY, or STUDENT" },
        { status: 400 }
      );
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Block self-role change
    if (targetUser.clerkId === adminClerkId) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 403 }
      );
    }

    const previousRole = targetUser.role;

    // Update Prisma
    const updated = await prisma.user.update({
      where: { id },
      data: { role: newRole },
    });

    // Sync Clerk publicMetadata only when the user has a linked Clerk account
    if (targetUser.clerkId) {
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(targetUser.clerkId, {
          publicMetadata: { role: newRole.toLowerCase() },
        });
      } catch (clerkErr) {
        console.error("[users/[id]] Clerk metadata sync failed:", clerkErr);
        // Non-fatal — Prisma is source of truth; warn but continue
      }
    }

    // Audit log
    try {
      const adminName = await getAdminName(adminClerkId);
      await logAuditAction({
        action: "UPDATED",
        entity: "User",
        entityId: id,
        description: `Role changed from ${previousRole} to ${newRole} for ${targetUser.name ?? targetUser.email}`,
        adminClerkId,
        adminName,
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
    });
  } catch (error) {
    console.error("[PATCH /api/users/[id]] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    const { userId: adminClerkId } = await auth();
    if (!adminClerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { student: true, faculty: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Block self-deletion
    if (targetUser.clerkId === adminClerkId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 403 }
      );
    }

    // 1. Delete from Clerk if clerkId exists
    if (targetUser.clerkId) {
      try {
        const client = await clerkClient();
        await client.users.deleteUser(targetUser.clerkId);
      } catch (clerkError) {
        console.error("Clerk user deletion failed:", clerkError);
      }
    }

    // 2. Delete any Admissions or Onboarding requests associated with this email
    try {
      await Promise.all([
        prisma.admission.deleteMany({ where: { email: targetUser.email } }),
        prisma.onboardingRequest.deleteMany({ where: { email: targetUser.email } }),
      ]);
    } catch (admError) {
      console.error("Failed to delete associated setup requests:", admError);
    }

    // 3. Delete from PostgreSQL (this cascades to Student / Faculty profiles automatically)
    await prisma.user.delete({
      where: { id },
    });

    // Audit log
    try {
      const adminName = await getAdminName(adminClerkId);
      await logAuditAction({
        action: "DELETED",
        entity: "User",
        entityId: id,
        description: `Deleted user account: ${targetUser.name ?? targetUser.email} (${targetUser.role})`,
        adminClerkId,
        adminName,
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/users/[id]] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
