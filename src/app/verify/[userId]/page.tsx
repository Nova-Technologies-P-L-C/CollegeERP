import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PublicProfileCard } from "./PublicProfileCard";

interface VerifyPageProps {
  params: Promise<{ userId: string }>;
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      student: {
        select: {
          id: true,
          rollNo: true,
          phone: true,
          department: true,
          semester: true,
          shift: true,
          enrollmentDate: true,
          cgpa: true,
          blocked: true,
          approvedBy: true,
          avatar: true,
          enrollments: {
            select: {
              course: {
                select: {
                  courseCode: true,
                  courseName: true,
                  creditHours: true,
                },
              },
            },
          },
          attendances: {
            select: {
              status: true,
            },
          },
          fees: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      faculty: {
        select: {
          id: true,
          phone: true,
          department: true,
          specialization: true,
          joinDate: true,
          avatar: true,
          teaches: {
            select: {
              courseCode: true,
              courseName: true,
              creditHours: true,
              semester: true,
              shift: true,
            },
          },
          attendances: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
            select: {
              status: true,
              checkInTime: true,
              checkOutTime: true,
            },
            take: 1,
          },
        },
      },
      admin: {
        select: { id: true },
      },
    },
  });

  if (!user) {
    notFound();
  }

  // Compute current time for live timetable lookup
  const now = new Date();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const currentDay = days[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  let currentLecture: {
    courseName: string;
    courseCode: string;
    room: string;
    startTime: string;
    endTime: string;
  } | null = null;

  if (user.role === "STUDENT" && user.student) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: user.student.id },
      select: { courseId: true },
    });

    const courseIds = enrollments.map((e) => e.courseId);

    if (courseIds.length > 0) {
      const entry = await prisma.timetable.findFirst({
        where: {
          courseId: { in: courseIds },
          day: currentDay,
          startTime: { lte: currentTime },
          endTime: { gte: currentTime },
        },
        include: {
          course: { select: { courseName: true, courseCode: true } },
        },
      });

      if (entry) {
        currentLecture = {
          courseName: entry.course.courseName,
          courseCode: entry.course.courseCode,
          room: entry.room,
          startTime: entry.startTime,
          endTime: entry.endTime,
        };
      }
    }
  }

  if (user.role === "FACULTY" && user.faculty) {
    const entry = await prisma.timetable.findFirst({
      where: {
        course: { assignedFaculty: user.faculty.id },
        day: currentDay,
        startTime: { lte: currentTime },
        endTime: { gte: currentTime },
      },
      include: {
        course: { select: { courseName: true, courseCode: true } },
      },
    });

    if (entry) {
      currentLecture = {
        courseName: entry.course.courseName,
        courseCode: entry.course.courseCode,
        room: entry.room,
        startTime: entry.startTime,
        endTime: entry.endTime,
      };
    }
  }

  // Compute student attendance rate
  let attendanceRate: number = 0;
  let totalAttendanceRecords: number = 0;
  if (user.role === "STUDENT" && user.student) {
    const totalRecords = user.student.attendances.length;
    totalAttendanceRecords = totalRecords;
    if (totalRecords > 0) {
      const presentCount = user.student.attendances.filter(
        (a) => a.status === "Present" || a.status === "Late"
      ).length;
      attendanceRate = Math.round((presentCount / totalRecords) * 100);
    }
  }

  // Compute faculty today detailed class schedule
  let facultyTodayClasses: {
    courseName: string;
    department: string;
    semester: number;
    room: string;
    startTime: string;
    endTime: string;
  }[] = [];

  if (user.role === "FACULTY" && user.faculty) {
    const todayEntries = await prisma.timetable.findMany({
      where: {
        course: { assignedFaculty: user.faculty.id },
        day: currentDay,
      },
      include: {
        course: { select: { courseName: true, department: true, semester: true } },
      },
      orderBy: { startTime: "asc" },
    });

    facultyTodayClasses = todayEntries.map((entry) => ({
      courseName: entry.course.courseName,
      department: entry.course.department,
      semester: entry.course.semester,
      room: entry.room,
      startTime: entry.startTime,
      endTime: entry.endTime,
    }));
  }

  // Assemble safe, display-ready profile data
  const profileData = {
    name: user.name ?? "Unknown",
    role: user.role as "STUDENT" | "FACULTY" | "ADMIN",
    institution: "Nova Technology",
    email: user.role !== "STUDENT" ? user.email : undefined,
    avatarUrl: user.avatar ?? user.student?.avatar ?? user.faculty?.avatar ?? null,
    currentLecture,
    ...(user.role === "STUDENT" && user.student
      ? {
        rollNo: user.student.rollNo,
        department: user.student.department,
        semester: user.student.semester,
        shift: user.student.shift,
        enrollmentDate: user.student.enrollmentDate.toISOString(),
        cgpa: user.student.cgpa,
        blocked: user.student.blocked,
        approvedBy: user.student.approvedBy,
        attendanceRate,
        totalAttendanceRecords,
        duesStatus:
          user.student.fees.filter((f) => f.status === "Unpaid" || f.status === "Overdue").length > 0
            ? ("Outstanding" as const)
            : ("Clear" as const),
        outstandingFees: user.student.fees.filter((f) => f.status === "Unpaid" || f.status === "Overdue").length,
        enrolledCourses: user.student.enrollments.map((e) => ({
          courseCode: e.course.courseCode,
          courseName: e.course.courseName,
          creditHours: e.course.creditHours,
        })),
      }
      : {}),
    ...(user.role === "FACULTY" && user.faculty
      ? {
        phone: user.faculty.phone,
        department: user.faculty.department,
        specialization: user.faculty.specialization,
        joinDate: user.faculty.joinDate.toISOString(),
        assignedCourses: user.faculty.teaches.map((c) => ({
          courseCode: c.courseCode,
          courseName: c.courseName,
          creditHours: c.creditHours,
          semester: c.semester,
          shift: c.shift,
        })),
        todayAttendance: user.faculty.attendances[0] && user.faculty.attendances[0].checkInTime
          ? {
            status: user.faculty.attendances[0].status,
            checkInTime: user.faculty.attendances[0].checkInTime.toISOString(),
            checkOutTime: user.faculty.attendances[0].checkOutTime?.toISOString() ?? null,
          }
          : null,
        todayClasses: facultyTodayClasses,
      }
      : {}),
    ...(user.role === "ADMIN" ? { designation: "System Administrator" } : {}),
  };

  return (
    <main className="min-h-screen bg-slate-200 dark:bg-zinc-950 text-foreground flex flex-col items-center justify-center p-4 gap-6 transition-colors">
      <PublicProfileCard profile={profileData} />
    </main>
  );
}
