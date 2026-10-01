import prisma from "@/lib/prisma";

/**
 * Called when a grade is updated — recalculates cumulative GPA for the student.
 */
export async function onGradeUpdated(studentId: string): Promise<void> {
  try {
    const grades = await prisma.grade.findMany({
      where: { studentId },
      select: { gpa: true },
    });

    if (grades.length === 0) return;

    const cumulativeGpa =
      grades.reduce((sum, g) => sum + g.gpa, 0) / grades.length;

    // Store the cumulative GPA rounded to 2 decimal places
    // This could update a Student.cumulativeGpa field if added later
    console.log(
      `[SyncHooks] Student ${studentId} cumulative GPA recalculated: ${cumulativeGpa.toFixed(2)}`
    );
  } catch (error) {
    console.error("[SyncHooks] onGradeUpdated error:", error);
  }
}

/**
 * Calculate attendance percentage for a student in a specific course.
 * Returns a value between 0 and 100.
 */
export async function getAttendancePercentage(
  studentId: string,
  courseId: string
): Promise<number> {
  try {
    const total = await prisma.attendance.count({
      where: { studentId, courseId },
    });

    if (total === 0) return 0;

    const present = await prisma.attendance.count({
      where: { studentId, courseId, status: { in: ["Present", "Late"] } },
    });

    return Math.round((present / total) * 100);
  } catch {
    return 0;
  }
}

/**
 * Calculate overall attendance percentage for a student across all courses.
 */
export async function getOverallAttendance(studentId: string): Promise<number> {
  try {
    const total = await prisma.attendance.count({
      where: { studentId },
    });

    if (total === 0) return 0;

    const present = await prisma.attendance.count({
      where: { studentId, status: { in: ["Present", "Late"] } },
    });

    return Math.round((present / total) * 100);
  } catch {
    return 0;
  }
}

/**
 * Calculate cumulative GPA for a student from all their grade records.
 */
export async function getCumulativeGPA(studentId: string): Promise<number> {
  try {
    const grades = await prisma.grade.findMany({
      where: { studentId },
      select: { gpa: true },
    });

    if (grades.length === 0) return 0;

    return parseFloat(
      (grades.reduce((sum, g) => sum + g.gpa, 0) / grades.length).toFixed(2)
    );
  } catch {
    return 0;
  }
}

/**
 * Check if a student has cleared all fees for a given semester.
 */
export async function isSemesterCleared(
  studentId: string,
  semester: number
): Promise<boolean> {
  try {
    const unpaid = await prisma.fee.count({
      where: {
        studentId,
        semester,
        status: { in: ["Unpaid", "Overdue"] },
      },
    });
    return unpaid === 0;
  } catch {
    return false;
  }
}
