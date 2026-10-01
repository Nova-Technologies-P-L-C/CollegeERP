import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logAuditAction, getAdminName } from "@/lib/audit-log";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const authUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    });

    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      studentIds?: string[];
      department?: string;
      semester?: number;
      targetSemester: number;
      gradesheetUrl?: string;
      totalMarks?: number;
      obtainedMarks?: number;
      percentage?: number;
      grade?: string;
      dropOffReason?: string;
      part1Marks?: number;
      part1MarksMap?: Record<string, number>;
    };

    if (!body || (!body.studentIds && (!body.department || !body.semester)) || !body.targetSemester) {
      return NextResponse.json({ error: "Missing required parameters (studentIds or department + semester, and targetSemester)" }, { status: 400 });
    }

    const targetSemester = Number(body.targetSemester);
    if (isNaN(targetSemester) || targetSemester < 1 || targetSemester > 10) {
      return NextResponse.json({ error: "targetSemester must be an integer between 1 and 10 (9 = Graduated, 10 = Drop Off)" }, { status: 400 });
    }

    const isGraduating = targetSemester === 9;
    const isDroppingOff = targetSemester === 10;

    if (isGraduating && (!body.gradesheetUrl || typeof body.gradesheetUrl !== "string" || !body.gradesheetUrl.trim())) {
      return NextResponse.json(
        { error: "A valid PDF grade sheet document is mandatory before converting a student to Alumni status." },
        { status: 400 }
      );
    }

    // Resolve which students to promote
    let promoteStudentIds: string[] = [];
    if (body.studentIds && Array.isArray(body.studentIds)) {
      promoteStudentIds = body.studentIds;
    } else if (body.department && body.semester) {
      const studentsInClass = await prisma.student.findMany({
        where: {
          department: body.department,
          semester: Number(body.semester),
        },
        select: { id: true },
      });
      promoteStudentIds = studentsInClass.map((s) => s.id);
    }

    if (promoteStudentIds.length === 0) {
      return NextResponse.json({ success: true, promotedCount: 0, promotedStudents: [], message: "No students found to promote" });
    }

    const adminName = await getAdminName(userId);
    const results = [];
    const errors = [];

    // Process each student
    for (const studentId of promoteStudentIds) {
      try {
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            semester: true,
            department: true,
            programLevel: true,
            discipline: true,
            part: true,
            subjectSet: true,
            rollNo: true,
            status: true,
            blocked: true,
            readmitRequested: true,
            fees: {
              where: { status: { in: ["Unpaid", "Overdue"] } },
              select: { amount: true, type: true, status: true },
            },
          },
        });

        if (!student) {
          errors.push(`Student ID ${studentId} not found`);
          continue;
        }

        if (isGraduating) {
          const completionStatus = student.programLevel === "INTERMEDIATE" ? "HSSC Completed" : "Graduated";

          if (student.status === "Graduated" || student.status === "HSSC Completed") {
            errors.push(`Student ${student.rollNo} is already marked as ${student.status}`);
            continue;
          }

          if (student.blocked) {
            errors.push(`Clearance Failed: Student ${student.rollNo} account is currently suspended/struck off.`);
            continue;
          }

          if (student.readmitRequested) {
            errors.push(`Clearance Failed: Student ${student.rollNo} has a pending re-admission request.`);
            continue;
          }

          if (student.fees && student.fees.length > 0) {
            const totalPending = student.fees.reduce((sum, f) => sum + f.amount, 0);
            errors.push(`Clearance Failed: Student ${student.rollNo} has ${student.fees.length} unpaid fee due(s) totaling PKR ${totalPending.toLocaleString()}. Graduation/Completion is blocked until cleared.`);
            continue;
          }

          const graduatedStudent = await prisma.$transaction(async (tx) => {
            const updated = await tx.student.update({
              where: { id: studentId },
              data: {
                status: completionStatus,
                semester: student.programLevel === "BS" ? 8 : (student.semester ?? 2),
                part: student.programLevel === "INTERMEDIATE" ? 2 : student.part,
                gradesheetUrl: body.gradesheetUrl || null,
                graduationDate: new Date(),
                ...(body.totalMarks !== undefined ? { totalMarks: Number(body.totalMarks) } : {}),
                ...(body.obtainedMarks !== undefined ? { obtainedMarks: Number(body.obtainedMarks) } : {}),
                ...(body.percentage !== undefined ? { percentage: Number(body.percentage) } : {}),
                ...(body.grade !== undefined ? { grade: body.grade || null } : {}),
              },
              include: { user: { select: { name: true } } },
            });
            await tx.enrollment.deleteMany({ where: { studentId: student.id } });
            return updated;
          });

          await logAuditAction({
            action: "UPDATED",
            entity: "Student",
            entityId: studentId,
            description: `Updated student ${student.rollNo} status to ${completionStatus}`,
            adminClerkId: userId,
            adminName,
          });

          results.push(graduatedStudent);
          continue;
        }

        if (isDroppingOff) {
          const droppedStudent = await prisma.$transaction(async (tx) => {
            const updated = await tx.student.update({
              where: { id: studentId },
              data: {
                status: "Left",
                leftReason: body.dropOffReason || "Dropped off during class promotion",
                leftDate: new Date(),
              },
              include: { user: { select: { name: true } } },
            });
            await tx.enrollment.deleteMany({ where: { studentId: student.id } });
            return updated;
          });

          await logAuditAction({
            action: "UPDATED",
            entity: "Student",
            entityId: studentId,
            description: `Marked student ${student.rollNo} as Left/Dropped Out during class promotion. Reason: ${body.dropOffReason || "N/A"}`,
            adminClerkId: userId,
            adminName,
          });

          results.push(droppedStudent);
          continue;
        }

        if (student.semester === targetSemester && student.status === "Active") {
          errors.push(`Student ${student.rollNo} is already in Semester/Part ${targetSemester}`);
          continue;
        }

        const updatedStudent = await prisma.$transaction(async (tx) => {
          const studentPart1Marks =
            body.part1MarksMap?.[studentId] ??
            (body.part1Marks !== undefined ? Number(body.part1Marks) : undefined);

          // Promote semester / part
          const updated = await tx.student.update({
            where: { id: studentId },
            data: {
              semester: targetSemester,
              part: student.programLevel === "INTERMEDIATE" ? targetSemester : student.part,
              ...(student.programLevel === "INTERMEDIATE" && targetSemester === 2 && studentPart1Marks !== undefined
                ? { part1Marks: studentPart1Marks }
                : {}),
              status: "Active",
            },
            include: { user: { select: { name: true } } },
          });

          // Clean up old semester enrollments
          await tx.enrollment.deleteMany({
            where: { studentId: student.id },
          });

          // Auto-enroll in target courses matching programLevel
          const courseWhere: Prisma.CourseWhereInput = {
            programLevel: student.programLevel,
          };
          if (student.programLevel === "INTERMEDIATE") {
            courseWhere.discipline = student.discipline || student.department;
            courseWhere.part = targetSemester;
            if (student.subjectSet) {
              courseWhere.subjectSet = student.subjectSet;
            }
          } else {
            courseWhere.department = student.department;
            courseWhere.semester = targetSemester;
          }

          const courses = await tx.course.findMany({ where: courseWhere });

          if (courses.length > 0) {
            await tx.enrollment.createMany({
              data: courses.map((c) => ({
                studentId: student.id,
                courseId: c.id,
                semester: targetSemester,
              })),
              skipDuplicates: true,
            });
          }

          return updated;
        });

        // Log audit action
        await logAuditAction({
          action: "UPDATED",
          entity: "Student",
          entityId: studentId,
          description: `Promoted student ${student.rollNo} from Semester ${student.semester} to Semester ${targetSemester} (Auto-enrolled in new courses)`,
          adminClerkId: userId,
          adminName,
        });

        results.push(updatedStudent);
      } catch (studentErr) {
        console.error(`Error promoting student ${studentId}:`, studentErr);
        errors.push(`Failed to promote student ${studentId}`);
      }
    }

    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: errors.join(" | "),
          promotedCount: 0,
          promotedStudents: [],
          errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      promotedCount: results.length,
      promotedStudents: results.map((s) => ({
        id: s.id,
        rollNo: s.rollNo,
        name: s.user?.name,
        semester: s.semester,
        status: s.status,
      })),
      errors,
    });
  } catch (error) {
    console.error("POST /api/students/promote error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
