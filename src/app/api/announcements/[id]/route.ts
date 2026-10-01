import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { AnnouncementAudience, Priority, Prisma } from "@prisma/client";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole(["ADMIN", "FACULTY"]);
  if (denied) return denied;

  try {
    const { userId } = await auth();
    const { id } = await params;
    const body = (await request.json()) as {
      title?: string;
      content?: string;
      author?: string;
      audience?: AnnouncementAudience;
      priority?: Priority;
    };

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.author !== undefined ? { author: body.author } : {}),
        ...(body.audience !== undefined ? { audience: body.audience } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
      },
    });

    if (!userId) throw new Error("Missing authenticated userId after requireRole");
    try {
      const adminName = await getAdminName(userId);
      await logAuditAction({
        action: "UPDATED",
        entity: "Announcement",
        entityId: id,
        description: `Edited announcement: "${announcement.title}"`,
        adminClerkId: userId,
        adminName,
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return NextResponse.json(announcement);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }
    console.error("PATCH /api/announcements/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole(["ADMIN", "FACULTY"]);
  if (denied) return denied;

  try {
    const { userId } = await auth();
    const { id } = await params;

    const announcement = await prisma.announcement.findUnique({ where: { id } });

    await prisma.announcement.delete({ where: { id } });

    if (!userId) throw new Error("Missing authenticated userId after requireRole");
    if (announcement) {
      try {
        const adminName = await getAdminName(userId);
        await logAuditAction({
          action: "DELETED",
          entity: "Announcement",
          entityId: id,
          description: `Deleted announcement: "${announcement.title}"`,
          adminClerkId: userId,
          adminName,
        });
      } catch (auditError) {
        console.error("Audit log failed:", auditError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }
    console.error("DELETE /api/announcements/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
