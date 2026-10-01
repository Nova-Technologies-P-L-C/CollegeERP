import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
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
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminName = await getAdminName(userId);
    const { id } = await params;
    const body = (await request.json()) as { status: "Approved" | "Rejected" | "Pending"; unblock?: boolean };

    if (!body.status || !["Approved", "Rejected", "Pending"].includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be Approved, Rejected, or Pending" },
        { status: 400 }
      );
    }

    let updatedAdmission;

    // Auto-provision Student + User + Enrollments when approved
    if (body.status === "Approved") {
      try {
        updatedAdmission = await prisma.$transaction(async (tx) => {
          // 1. Update status
          const adm = await tx.admission.update({
            where: { id },
            data: { status: "Approved" },
          });

          // 2. Check if a user with this email already exists
          const existingUser = await tx.user.findUnique({
            where: { email: adm.email },
            include: { student: true },
          });

          if (!adm.appliedDepartment) throw new Error("Missing appliedDepartment");

          // Department code mapping helper
          const getDeptCode = (dept: string): string => {
            const mapping: Record<string, string> = {
              "Computer Science": "CS",
              "Mathematics": "MATH",
              "Physics": "PHY",
              "English": "ENG",
              "Chemistry": "CHM",
              "Economics": "ECO",
              "Urdu": "URD",
              "Islamic Studies": "ISL",
            };
            return mapping[dept] || (dept.length >= 2 ? dept.substring(0, 2).toUpperCase() : "XX");
          };

          const currentYear = new Date().getFullYear();
          const deptCode = getDeptCode(adm.appliedDepartment);
          const prefix = `${deptCode}-${currentYear}-`;

          // Find maximum sequence number among existing students with this prefix
          const existingStudents = await tx.student.findMany({
            where: {
              rollNo: {
                startsWith: prefix,
              },
            },
            select: { rollNo: true },
          });

          let maxSeq = 0;
          for (const s of existingStudents) {
            const parts = s.rollNo.split("-");
            const seqStr = parts[parts.length - 1];
            const seq = parseInt(seqStr, 10);
            if (!isNaN(seq) && seq > maxSeq) {
              maxSeq = seq;
            }
          }

          const nextSeq = maxSeq + 1;
          const rollNo = `${prefix}${String(nextSeq).padStart(2, "0")}`;

          if (!existingUser) {
            // Create User + Student + enrollments
            const newUser = await tx.user.create({
              data: {
                email: adm.email,
                name: adm.studentName,
                role: "STUDENT",
              },
            });

            const student = await tx.student.create({
              data: {
                userId: newUser.id,
                rollNo,
                phone: adm.phone,
                department: adm.appliedDepartment,
                semester: adm.semester,
                programLevel: adm.programLevel,
                discipline: adm.discipline || (adm.programLevel === "INTERMEDIATE" ? adm.appliedDepartment : null),
                part: adm.part || (adm.programLevel === "INTERMEDIATE" ? adm.semester : null),
                shift: adm.shift,
                obtainedMarks: adm.marksObtained ? Math.round(adm.marksObtained) : null,
                totalMarks: adm.totalMarks ? Math.round(adm.totalMarks) : (adm.programLevel === "INTERMEDIATE" ? 1100 : null),
                enrollmentDate: new Date(),
                approvedBy: adminName,
              },
            });

            // Auto-enroll student in ALL courses matching program level and discipline/part or department/semester
            const courseWhere: Prisma.CourseWhereInput = {
              programLevel: adm.programLevel,
            };
            if (adm.programLevel === "INTERMEDIATE") {
              courseWhere.discipline = adm.discipline || adm.appliedDepartment;
              courseWhere.part = adm.part || adm.semester;
            } else {
              courseWhere.department = adm.appliedDepartment;
              courseWhere.semester = adm.semester;
            }

            const courses = await tx.course.findMany({ where: courseWhere });
            for (const course of courses) {
              await tx.enrollment.create({
                data: {
                  studentId: student.id,
                  courseId: course.id,
                  semester: course.semester || (course.part ?? 1),
                },
              });
            }
          } else if (!existingUser.student) {
            // User exists but has no Student record. Provision it!
            await tx.user.update({
              where: { id: existingUser.id },
              data: { role: "STUDENT" },
            });

            const student = await tx.student.create({
              data: {
                userId: existingUser.id,
                rollNo,
                phone: adm.phone,
                department: adm.appliedDepartment,
                semester: adm.semester,
                programLevel: adm.programLevel,
                discipline: adm.discipline || (adm.programLevel === "INTERMEDIATE" ? adm.appliedDepartment : null),
                part: adm.part || (adm.programLevel === "INTERMEDIATE" ? adm.semester : null),
                shift: adm.shift,
                obtainedMarks: adm.marksObtained ? Math.round(adm.marksObtained) : null,
                totalMarks: adm.totalMarks ? Math.round(adm.totalMarks) : (adm.programLevel === "INTERMEDIATE" ? 1100 : null),
                enrollmentDate: new Date(),
                approvedBy: adminName,
              },
            });

            const courseWhere: Prisma.CourseWhereInput = {
              programLevel: adm.programLevel,
            };
            if (adm.programLevel === "INTERMEDIATE") {
              courseWhere.discipline = adm.discipline || adm.appliedDepartment;
              courseWhere.part = adm.part || adm.semester;
            } else {
              courseWhere.department = adm.appliedDepartment;
              courseWhere.semester = adm.semester;
            }

            const courses = await tx.course.findMany({ where: courseWhere });
            for (const course of courses) {
              await tx.enrollment.create({
                data: {
                  studentId: student.id,
                  courseId: course.id,
                  semester: course.semester || (course.part ?? 1),
                },
              });
            }
          }

          return adm;
        });

        // 3. Sync Clerk role to publicMetadata if linked account exists
        const clerkUser = await prisma.user.findUnique({
          where: { email: updatedAdmission.email },
          select: { clerkId: true },
        });

        if (clerkUser?.clerkId) {
          try {
            const client = await clerkClient();
            await client.users.updateUserMetadata(clerkUser.clerkId, {
              publicMetadata: { role: "student" },
            });
          } catch (clerkErr) {
            console.error("Clerk metadata sync failed during admission approval:", clerkErr);
          }
        }

        await logAuditAction({
          action: "UPDATED",
          entity: "Admission",
          entityId: id,
          description: `Approved admission for ${updatedAdmission.studentName} — Student record and course enrollments auto-created`,
          adminClerkId: userId,
          adminName,
        });
      } catch (provisionError) {
        console.error("Auto-provision error:", provisionError);
        return NextResponse.json(
          { error: provisionError instanceof Error ? provisionError.message : "Failed to auto-provision student account" },
          { status: 500 }
        );
      }
    } else if (body.status === "Pending" && body.unblock) {
      // Admin is unblocking a student — reset status and clear block flag
      updatedAdmission = await prisma.admission.update({
        where: { id },
        data: { status: "Pending", blocked: false },
      });

      // Also clear blocked flag on ALL admissions for this email
      await prisma.admission.updateMany({
        where: { email: updatedAdmission.email, blocked: true },
        data: { blocked: false },
      });

      const adminName = await getAdminName(userId);
      await logAuditAction({
        action: "UPDATED",
        entity: "Admission",
        entityId: id,
        description: `Unblocked and reset admission for ${updatedAdmission.studentName} to Pending`,
        adminClerkId: userId,
        adminName,
      });
    } else {
      updatedAdmission = await prisma.admission.update({
        where: { id },
        data: { status: body.status },
      });

      // Auto-block on 2nd rejection
      if (body.status === "Rejected") {
        const rejectedCount = await prisma.admission.count({
          where: { email: updatedAdmission.email, status: "Rejected" },
        });
        if (rejectedCount >= 2) {
          await prisma.admission.updateMany({
            where: { email: updatedAdmission.email },
            data: { blocked: true },
          });
        }
      }

      const adminName = await getAdminName(userId);
      await logAuditAction({
        action: "UPDATED",
        entity: "Admission",
        entityId: id,
        description: `Changed admission status for ${updatedAdmission.studentName} to ${body.status}`,
        adminClerkId: userId,
        adminName,
      });
    }

    return NextResponse.json(updatedAdmission);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }
    console.error("PATCH /api/admissions/[id] error:", error);
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
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const admission = await prisma.admission.findUnique({ where: { id } });
    if (!admission) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    if (admission.status === "Approved") {
      return NextResponse.json(
        { error: "Cannot delete an approved admission. Reject it first." },
        { status: 400 }
      );
    }

    await prisma.admission.delete({ where: { id } });

    try {
      const adminName = await getAdminName(userId);
      await logAuditAction({
        action: "DELETED",
        entity: "Admission",
        entityId: id,
        description: `Deleted ${admission.status} admission for ${admission.studentName}`,
        adminClerkId: userId,
        adminName,
      });
    } catch (auditError) {
      console.error("Audit log failed:", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admissions/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}