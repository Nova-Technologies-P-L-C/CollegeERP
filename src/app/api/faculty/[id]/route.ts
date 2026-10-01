import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { Prisma } from "@prisma/client";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireRole(["ADMIN"]);
  if (denied) return denied;

  try {
    const { userId } = await auth();
    const { id } = await params;
    const body = (await request.json()) as {
      phone?: string;
      department?: string;
      specialization?: string;
      avatar?: string;
      assignedCourseIds?: string[];
    };

    if (body.assignedCourseIds !== undefined && Array.isArray(body.assignedCourseIds)) {
      // 1. Unassign courses currently assigned to this faculty
      await prisma.course.updateMany({
        where: { assignedFaculty: id },
        data: { assignedFaculty: null },
      });
      // 2. Assign selected courses to this faculty
      if (body.assignedCourseIds.length > 0) {
        await prisma.course.updateMany({
          where: { id: { in: body.assignedCourseIds } },
          data: { assignedFaculty: id },
        });
      }
    }

    const faculty = await prisma.faculty.update({
      where: { id },
      data: {
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.department !== undefined ? { department: body.department } : {}),
        ...(body.specialization !== undefined ? { specialization: body.specialization } : {}),
        ...(body.avatar !== undefined ? { avatar: body.avatar } : {}),
      },
      include: {
        user: { select: { name: true } },
        teaches: { select: { id: true, courseCode: true, courseName: true } },
      },
    });

    if (!userId) throw new Error("Missing userId after requireRole");
    try {
      const adminName = await getAdminName(userId);
      await logAuditAction({
        action: "UPDATED",
        entity: "Faculty",
        entityId: id,
        description: `Edited faculty profile: ${faculty.user.name ?? "Unknown"}`,
        adminClerkId: userId,
        adminName,
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return NextResponse.json(faculty);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Faculty not found" }, { status: 404 });
    }
    console.error("PATCH /api/faculty/[id] error:", error);
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
    const { id } = await params;

    const faculty = await prisma.faculty.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!faculty) {
      return NextResponse.json({ error: "Faculty not found" }, { status: 404 });
    }

    // 1. Release assigned courses
    try {
      await prisma.course.updateMany({
        where: { assignedFaculty: id },
        data: { assignedFaculty: null },
      });
    } catch (courseErr) {
      console.error("Failed to release course assignments:", courseErr);
    }

    // 2. Delete from Clerk if clerkId exists
    if (faculty.user.clerkId) {
      try {
        const client = await clerkClient();
        await client.users.deleteUser(faculty.user.clerkId);
      } catch (clerkError) {
        console.error("Clerk user deletion failed:", clerkError);
      }
    }

    // 3. Delete onboarding requests and admissions associated with this email
    try {
      await Promise.all([
        prisma.onboardingRequest.deleteMany({
          where: { email: faculty.user.email },
        }),
        prisma.admission.deleteMany({
          where: { email: faculty.user.email },
        }),
      ]);
    } catch (reqError) {
      console.error("Failed to delete associated setup requests during faculty delete:", reqError);
    }

    // 4. Delete User from PostgreSQL (which cascades to Faculty profile)
    try {
      await prisma.user.delete({
        where: { id: faculty.userId },
      });
    } catch (dbError) {
      console.log("User already deleted or database delete failed:", dbError);
    }

    if (adminClerkId) {
      try {
        const adminName = await getAdminName(adminClerkId);
        await logAuditAction({
          action: "DELETED",
          entity: "Faculty",
          entityId: id,
          description: `Deleted faculty: ${faculty.user.name ?? "Unknown"} and all associated records from portal and authentication`,
          adminClerkId: adminClerkId,
          adminName,
        });
      } catch (auditError) {
        console.error("Audit log failed:", auditError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Faculty not found" }, { status: 404 });
    }
    console.error("DELETE /api/faculty/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
