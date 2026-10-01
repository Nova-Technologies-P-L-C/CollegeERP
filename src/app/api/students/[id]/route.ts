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
  const denied = await requireRole(["ADMIN", "FACULTY"]);
  if (denied) return denied;

  try {
    const { userId } = await auth();
    const { id } = await params;
    const body = (await request.json()) as {
      rollNo?: string;
      phone?: string;
      department?: string;
      semester?: number;
      avatar?: string;
      shift?: string;
      blocked?: boolean;
      readmitRequested?: boolean;
    };

    if (body.blocked === false) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId ?? "" },
        select: { role: true },
      });
      if (dbUser?.role === "FACULTY") {
        return NextResponse.json(
          { error: "Forbidden: Only admins can readmit a student." },
          { status: 403 }
        );
      }
    }

    const updateData: Prisma.StudentUpdateInput = {
      ...(body.rollNo !== undefined ? { rollNo: body.rollNo } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.department !== undefined ? { department: body.department } : {}),
      ...(body.semester !== undefined ? { semester: body.semester } : {}),
      ...(body.avatar !== undefined ? { avatar: body.avatar } : {}),
      ...(body.shift !== undefined ? { shift: body.shift } : {}),
      ...(body.blocked !== undefined
        ? {
            blocked: body.blocked,
            ...(body.blocked === false ? { readmitRequested: false } : {}),
          }
        : {}),
      ...(body.readmitRequested !== undefined ? { readmitRequested: body.readmitRequested } : {}),
    };

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      include: { user: { select: { name: true } } },
    });

    if (userId) {
      try {
        const adminName = await getAdminName(userId);
        await logAuditAction({
          action: "UPDATED",
          entity: "Student",
          entityId: id,
          description: `Edited student profile: ${student.user.name ?? student.rollNo} (Roll No: ${student.rollNo}, Dept: ${student.department}, Sem: ${student.semester})`,
          adminClerkId: userId,
          adminName,
        });
      } catch (auditError) {
        console.error("Audit log failed:", auditError);
      }
    }

    return NextResponse.json(student);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    console.error("PATCH /api/students/[id] error:", error);
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

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 1. Delete from Clerk if clerkId exists
    if (student.user.clerkId) {
      try {
        const client = await clerkClient();
        await client.users.deleteUser(student.user.clerkId);
      } catch (clerkError) {
        console.error("Clerk user deletion failed:", clerkError);
        // Continue database cleanup even if Clerk delete fails
      }
    }

    // 2. Delete User from PostgreSQL (which cascades to Student profile and all other student tables)
    try {
      await prisma.user.delete({
        where: { id: student.userId },
      });
    } catch (dbError) {
      console.log("User already deleted or database delete failed:", dbError);
    }

    // 3. Delete any Admissions or Onboarding requests associated with this student's email
    try {
      await Promise.all([
        prisma.admission.deleteMany({
          where: { email: student.user.email },
        }),
        prisma.onboardingRequest.deleteMany({
          where: { email: student.user.email },
        }),
      ]);
    } catch (admError) {
      console.error("Failed to delete admissions/onboarding requests during student delete:", admError);
    }

    if (adminClerkId) {
      try {
        const adminName = await getAdminName(adminClerkId);
        await logAuditAction({
          action: "DELETED",
          entity: "Student",
          entityId: id,
          description: `Deleted student: ${student.user.name ?? student.rollNo} and all associated records from portal and authentication`,
          adminClerkId: adminClerkId,
          adminName,
        });
      } catch (auditError) {
        console.error("Audit log failed:", auditError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/students/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
