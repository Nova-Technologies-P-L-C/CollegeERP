import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function resolveDashboardUser(clerkId: string, email?: string | null) {
  const include = {
    student: true,
  } as const;

  const userByClerkId = await prisma.user.findUnique({
    where: { clerkId },
    include,
  });

  if (userByClerkId) {
    return userByClerkId;
  }

  if (!email) {
    return null;
  }

  const userByEmail = await prisma.user.findUnique({
    where: { email },
    include,
  });

  if (!userByEmail) {
    return null;
  }

  if (userByEmail.clerkId === clerkId) {
    return userByEmail;
  }

  return prisma.user.update({
    where: { id: userByEmail.id },
    data: { clerkId },
    include,
  });
}

export async function getStudentDashboardData(clerkId: string, email?: string | null) {
  const user = await resolveDashboardUser(clerkId, email);

  if (!user) {
    return null;
  }

  if (user.role?.toUpperCase() !== "STUDENT" || !user.student) {
    return { isNotStudent: true };
  }

  const student = user.student;

  // Self-heal entrance marks for intermediate students if missing on student record
  if (
    student.programLevel === "INTERMEDIATE" &&
    (student.obtainedMarks === null || student.obtainedMarks === undefined) &&
    user.email
  ) {
    const adm = await prisma.admission.findFirst({
      where: { email: user.email },
      select: { marksObtained: true, totalMarks: true },
    });
    if (adm && adm.marksObtained) {
      student.obtainedMarks = Math.round(adm.marksObtained);
      student.totalMarks = adm.totalMarks ? Math.round(adm.totalMarks) : 1100;
      prisma.student.update({
        where: { id: student.id },
        data: {
          obtainedMarks: student.obtainedMarks,
          totalMarks: student.totalMarks,
        },
      }).catch(() => null);
    }
  }

  // Fetch all other components in parallel to reduce sequential RTT delay with slim field selection
  const [
    grades,
    attendances,
    fees,
    initialEnrollments,
    quizAttempts,
    classTimetables,
    announcements,
  ] = await Promise.all([
    prisma.grade.findMany({
      where: {
        studentId: student.id,
        course: { semester: student.semester },
      },
      select: {
        courseId: true,
        midMarks: true,
        finalMarks: true,
        total: true,
        gpa: true,
      },
    }),
    prisma.attendance.findMany({
      where: {
        studentId: student.id,
        course: { semester: student.semester },
      },
      select: {
        courseId: true,
        status: true,
      },
    }),
    prisma.fee.findMany({
      where: {
        studentId: student.id,
        semester: student.semester,
      },
      select: {
        status: true,
        amount: true,
      },
    }),
    prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        semester: student.semester,
      },
      select: {
        id: true,
        courseId: true,
        blocked: true,
        readmitRequested: true,
        course: {
          select: {
            id: true,
            courseCode: true,
            courseName: true,
            creditHours: true,
            quizzes: {
              where: { status: "Published" },
              select: {
                id: true,
                title: true,
                courseId: true,
                duration: true,
                dueDate: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    prisma.quizAttempt.findMany({
      where: { studentId: student.id },
      select: { quizId: true },
    }),
    prisma.timetable.findMany({
      where: {
        course: {
          department: student.department,
          semester: student.semester,
        },
        shift: student.shift,
      },
      select: {
        id: true,
        day: true,
        courseId: true,
        startTime: true,
        endTime: true,
        room: true,
        course: {
          select: {
            courseCode: true,
            courseName: true,
            department: true,
            semester: true,
            faculty: {
              select: {
                user: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.announcement.findMany({
      where: {
        audience: { in: ["Students", "All"] },
        OR: [
          { targetDepartment: null, targetSemester: null },
          { targetDepartment: student.department, targetSemester: null },
          { targetDepartment: null, targetSemester: student.semester },
          { targetDepartment: student.department, targetSemester: student.semester },
        ],
      },
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        date: true,
      },
      orderBy: { date: "desc" },
      take: 5,
    }),
  ]);

  let enrollments = initialEnrollments;

  // Self-healing enrollments sync: run only if enrollments list is empty
  if (enrollments.length === 0) {
    const createdCount = await ensureStudentEnrollments(student.id, student.department, student.semester);
    if (createdCount > 0) {
      // Re-fetch only enrollments since they were newly created
      enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id, semester: student.semester },
        select: {
          id: true,
          courseId: true,
          blocked: true,
          readmitRequested: true,
          course: {
            select: {
              id: true,
              courseCode: true,
              courseName: true,
              creditHours: true,
              quizzes: {
                where: { status: "Published" },
                select: {
                  id: true,
                  title: true,
                  courseId: true,
                  duration: true,
                  dueDate: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    }
  }

  // STATS
  const previousCGPA = student.cgpa !== undefined ? student.cgpa : 0.0;

  const presentCount = attendances.filter((a) => a.status === "Present" || a.status === "Late").length;
  const attendancePercent = attendances.length > 0
    ? Math.round((presentCount / attendances.length) * 100)
    : 0;

  const pendingDues = fees
    .filter((f) => f.status !== "Paid")
    .reduce((sum, f) => sum + f.amount, 0);

  const totalPaid = fees
    .filter((f) => f.status === "Paid")
    .reduce((sum, f) => sum + f.amount, 0);

  const enrolledCourses = enrollments.map((e) => e.course);

  const stats = {
    currentGpa: previousCGPA,
    currentGPA: previousCGPA,
    attendanceRate: attendancePercent,
    attendancePercent,
    totalDues: pendingDues,
    pendingDues,
    totalCourses: enrolledCourses.length,
    enrolledCourses: enrolledCourses.length,
    totalPaid,
  };

  // Timetable: Map timetable format
  const timetable = classTimetables.map((t) => ({
    id: t.id,
    day: t.day,
    courseId: t.courseId,
    startTime: t.startTime,
    endTime: t.endTime,
    room: t.room,
    course: {
      courseCode: t.course.courseCode,
      courseName: t.course.courseName,
      department: t.course.department,
      semester: t.course.semester,
      faculty: t.course.faculty ? { user: { name: t.course.faculty.user.name } } : null,
    },
  }));

  // Quizzes
  const allQuizzes = enrolledCourses.flatMap((c) => c.quizzes);
  const attemptedQuizIds = quizAttempts.map((a) => a.quizId);
  const pendingQuizzes = allQuizzes
    .filter((q) => q.status === "Published" && !attemptedQuizIds.includes(q.id))
    .map((q) => ({
      id: q.id,
      title: q.title,
      courseId: q.courseId,
      duration: q.duration,
      dueDate: q.dueDate.toISOString(),
      status: q.status,
    }));

  // Announcements
  const studentAnnouncements = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    priority: a.priority,
    date: a.date.toISOString(),
  }));

  // Chart Data: Attendance
  const attendanceChartData = enrolledCourses.map((course) => {
    const courseAttendances = attendances.filter((a) => a.courseId === course.id);
    const present = courseAttendances.filter((a) => a.status === "Present").length;
    const absent = courseAttendances.filter((a) => a.status === "Absent").length;
    const late = courseAttendances.filter((a) => a.status === "Late").length;

    return {
      course: course.courseCode,
      present,
      absent,
      late,
    };
  });

  // Chart Data: Grades (Midterm & Sessional only)
  const gradeChartData = enrolledCourses.map((course) => {
    const grade = grades.find((g) => g.courseId === course.id);
    return {
      course: course.courseCode,
      mid: grade?.midMarks || 0,
      sessional: grade?.finalMarks || 0,
    };
  });

  return {
    stats,
    courses: enrolledCourses.map((c) => ({
      id: c.id,
      courseCode: c.courseCode,
      courseName: c.courseName,
      creditHours: c.creditHours,
    })),
    enrollments: enrollments.map((e) => ({
      id: e.id,
      courseId: e.courseId,
      courseCode: e.course.courseCode,
      blocked: e.blocked,
      readmitRequested: e.readmitRequested,
    })),
    timetable,
    pendingQuizzes,
    studentAnnouncements,
    attendanceChartData,
    gradeChartData,
    studentProfile: {
      department: student.department,
      discipline: student.discipline,
      programLevel: student.programLevel,
      semester: student.semester,
      part: student.part,
      shift: student.shift,
      blocked: student.blocked,
      readmitRequested: student.readmitRequested,
      status: student.status,
      rollNo: student.rollNo,
      cgpa: student.cgpa,
      obtainedMarks: student.obtainedMarks,
      totalMarks: student.totalMarks,
      part1Marks: student.part1Marks,
      gradesheetUrl: student.gradesheetUrl,
      graduationDate: student.graduationDate?.toISOString(),
      enrollmentDate: student.enrollmentDate?.toISOString(),
    },
  };
}

export async function ensureStudentEnrollments(
  studentId: string,
  department?: string | null,
  semester?: number | null
): Promise<number> {
  const studentRecord = await prisma.student.findUnique({
    where: { id: studentId },
    select: { status: true, programLevel: true, department: true, semester: true, discipline: true, part: true, subjectSet: true },
  });
  if (studentRecord?.status === "Graduated" || studentRecord?.status === "HSSC Completed") {
    return 0;
  }

  const targetTerm = studentRecord?.programLevel === "INTERMEDIATE" ? (studentRecord.part ?? 1) : (studentRecord?.semester ?? semester ?? 1);

  // Check if student has any enrollments for this term
  const count = await prisma.enrollment.count({
    where: { studentId, semester: targetTerm },
  });

  if (count > 0) {
    return 0;
  }

  // Find courses matching programLevel and domain fields
  const courseWhere: Prisma.CourseWhereInput = {
    programLevel: studentRecord?.programLevel || "BS",
  };

  if (studentRecord?.programLevel === "INTERMEDIATE") {
    courseWhere.discipline = studentRecord.discipline || department || "F.Sc Pre-Medical";
    courseWhere.part = studentRecord.part || targetTerm;
    if (studentRecord.subjectSet) {
      courseWhere.subjectSet = studentRecord.subjectSet;
    }
  } else {
    courseWhere.department = studentRecord?.department || department || "Computer Science";
    courseWhere.semester = studentRecord?.semester || targetTerm;
  }

  const courses = await prisma.course.findMany({
    where: courseWhere,
  });

  if (courses.length === 0) {
    return 0;
  }

  // Create enrollments for each course
  const enrollmentData = courses.map((course) => ({
    studentId,
    courseId: course.id,
    semester: targetTerm,
  }));

  const created = await prisma.enrollment.createMany({
    data: enrollmentData,
    skipDuplicates: true,
  });

  return created.count;
}
