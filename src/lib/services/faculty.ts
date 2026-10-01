import prisma from "@/lib/prisma";
import { ProgramLevel } from "@prisma/client";

interface FacultyDashboardData {
  stats: {
    totalCourses: number;
    totalStudents: number;
    avgRating: number;
    pendingQuizReviews: number;
    avgStudentGpa: number;
  };
  courses: { id: string; courseCode: string; courseName: string; enrolledCount: number }[];
  timetable: {
    id: string;
    day: string;
    courseCode: string;
    courseName: string;
    startTime: string;
    endTime: string;
    room: string;
  }[];
  announcements: { id: string; title: string; priority: string; date: string }[];
  attendanceOverview: { name: string; value: number }[];
}

export async function getFacultyDashboardData(
  clerkId: string,
  programLevel?: string
): Promise<FacultyDashboardData | null> {
  const levelFilter = (programLevel === "INTERMEDIATE" ? "INTERMEDIATE" : "BS") as ProgramLevel;

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      role: true,
      faculty: {
        select: {
          id: true,
          department: true,
        },
      },
    },
  });

  if (!user || user.role?.toUpperCase() !== "FACULTY" || !user.faculty) {
    return null;
  }

  const faculty = user.faculty;

  // Direct indexed query on courses taught by this faculty matching the programLevel
  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { assignedFaculty: faculty.id },
        { assignedFacultyMorning: faculty.id },
        { assignedFacultyEvening: faculty.id },
      ],
      programLevel: levelFilter,
    },
    select: {
      id: true,
      courseCode: true,
      courseName: true,
      enrollments: {
        select: { studentId: true },
      },
      timetables: {
        select: {
          id: true,
          day: true,
          startTime: true,
          endTime: true,
          room: true,
        },
      },
      _count: {
        select: {
          quizzes: {
            where: { status: "Published" },
          },
        },
      },
    },
  });

  const courseIds = courses.map((c) => c.id);

  const uniqueStudentIds = new Set<string>();
  for (const course of courses) {
    for (const enrollment of course.enrollments) {
      uniqueStudentIds.add(enrollment.studentId);
    }
  }

  const [feedbacks, attendanceGroups, gradeStats, announcements] = await Promise.all([
    prisma.feedback.findMany({
      where: { targetId: faculty.id, type: "Faculty" },
      select: { rating: true },
    }),
    courseIds.length > 0
      ? prisma.attendance.groupBy({
          by: ["status"],
          where: { courseId: { in: courseIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    courseIds.length > 0
      ? prisma.grade.aggregate({
          where: { courseId: { in: courseIds } },
          _avg: { gpa: true },
        })
      : Promise.resolve({ _avg: { gpa: 0 } }),
    prisma.announcement.findMany({
      where: {
        audience: { in: ["Faculty", "All"] },
        OR: [
          { targetDepartment: null },
          { targetDepartment: faculty.department },
        ],
        programLevel: levelFilter,
      },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, title: true, priority: true, date: true },
    }).catch(() =>
      prisma.announcement.findMany({
        where: {
          audience: { in: ["Faculty", "All"] },
          OR: [
            { targetDepartment: null },
            { targetDepartment: faculty.department },
          ],
        },
        orderBy: { date: "desc" },
        take: 5,
        select: { id: true, title: true, priority: true, date: true },
      })
    ),
  ]);

  const avgRating =
    feedbacks.length > 0
      ? +(feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(2)
      : 0;

  const pendingQuizReviews = courses.reduce((sum, c) => sum + c._count.quizzes, 0);

  // Attendance overview for faculty's courses
  const attendanceMap: Record<string, number> = {};
  for (const group of attendanceGroups) {
    attendanceMap[group.status] = group._count._all;
  }
  const attendanceOverview = [
    { name: "Present", value: attendanceMap["Present"] ?? 0 },
    { name: "Absent", value: attendanceMap["Absent"] ?? 0 },
    { name: "Late", value: attendanceMap["Late"] ?? 0 },
  ];

  return {
    stats: {
      totalCourses: courses.length,
      totalStudents: uniqueStudentIds.size,
      avgRating,
      pendingQuizReviews,
      avgStudentGpa: +(gradeStats._avg.gpa ?? 0).toFixed(2),
    },
    courses: courses.map((c) => ({
      id: c.id,
      courseCode: c.courseCode,
      courseName: c.courseName,
      enrolledCount: c.enrollments.length,
    })),
    timetable: courses.flatMap((c) =>
      c.timetables.map((t) => ({
        id: t.id,
        day: t.day,
        courseCode: c.courseCode,
        courseName: c.courseName,
        startTime: t.startTime,
        endTime: t.endTime,
        room: t.room,
      }))
    ),
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      priority: a.priority,
      date: a.date.toISOString(),
    })),
    attendanceOverview,
  };
}

