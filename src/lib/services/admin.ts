import prisma from "@/lib/prisma";

interface AdminDashboardData {
  stats: {
    totalStudents: number;
    totalFaculty: number;
    activeCourses: number;
    pendingAdmissions: number;
    totalFeeCollected: number;
    totalFeePending: number;
    attendanceRate: number;
  };
  studentsPerDepartment: { department: string; students: number }[];
  attendanceOverview: { name: string; value: number }[];
  recentAnnouncements: { id: string; title: string; priority: string; date: string }[];
}

export async function getAdminDashboardData(programLevel?: string): Promise<AdminDashboardData> {
  const levelFilter = programLevel === "INTERMEDIATE" ? "INTERMEDIATE" : "BS";

  const [
    totalStudents,
    totalFaculty,
    activeCourses,
    pendingAdmissions,
    fees,
    attendances,
    studentsByDept,
    recentAnnouncements,
  ] = await Promise.all([
    prisma.student.count({
      where: {
        status: { not: "Graduated" },
        programLevel: levelFilter,
      },
    }),
    prisma.user.count({ where: { role: "FACULTY", faculty: { isNot: null } } }),
    prisma.course.count({
      where: { programLevel: levelFilter },
    }),
    prisma.admission.count({
      where: { status: "Pending", programLevel: levelFilter },
    }),
    prisma.fee.groupBy({
      where: { student: { programLevel: levelFilter } },
      by: ["status"],
      _sum: { amount: true },
    }),
    prisma.attendance.groupBy({
      where: { student: { programLevel: levelFilter } },
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.student.groupBy({
      where: { status: { not: "Graduated" }, programLevel: levelFilter },
      by: ["department"],
      _count: { _all: true },
    }),
    prisma.announcement.findMany({
      where: { programLevel: levelFilter },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, title: true, priority: true, date: true },
    }),
  ]);

  const totalFeeCollected = fees
    .filter((f) => f.status === "Paid")
    .reduce((sum, f) => sum + (f._sum.amount ?? 0), 0);

  const totalFeePending = fees
    .filter((f) => f.status !== "Paid")
    .reduce((sum, f) => sum + (f._sum.amount ?? 0), 0);

  const attendanceMap: Record<string, number> = {};
  let totalAttendance = 0;
  for (const group of attendances) {
    attendanceMap[group.status] = group._count._all;
    totalAttendance += group._count._all;
  }

  const presentCount = (attendanceMap["Present"] ?? 0) + (attendanceMap["Late"] ?? 0);
  const attendanceRate =
    totalAttendance > 0
      ? Math.round((presentCount / totalAttendance) * 100)
      : 0;

  const attendanceOverview = [
    { name: "Present", value: attendanceMap["Present"] ?? 0 },
    { name: "Absent", value: attendanceMap["Absent"] ?? 0 },
    { name: "Late", value: attendanceMap["Late"] ?? 0 },
  ];

  const studentsPerDepartment = studentsByDept.map((d) => ({
    department: d.department,
    students: d._count._all,
  }));

  return {
    stats: {
      totalStudents,
      totalFaculty,
      activeCourses,
      pendingAdmissions,
      totalFeeCollected,
      totalFeePending,
      attendanceRate,
    },
    studentsPerDepartment,
    attendanceOverview,
    recentAnnouncements: recentAnnouncements.map((a) => ({
      id: a.id,
      title: a.title,
      priority: a.priority,
      date: a.date.toISOString(),
    })),
  };
}
