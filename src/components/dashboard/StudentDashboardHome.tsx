"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { useUser } from "@clerk/nextjs";
import {
  GraduationCap,
  Clock,
  CreditCard,
  BookOpen,
  ArrowRight,
  FileText,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  StatsCardSkeleton,
  ChartSkeleton,
  ListSkeleton,
  TableSkeleton,
} from "@/components/ui";
import { AlumniDashboardHome } from "@/components/dashboard/AlumniDashboardHome";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface TimetableEntry {
  id: string;
  day: string;
  room: string;
  startTime: string;
  endTime: string;
  course: {
    courseCode: string;
    courseName: string;
    department: string;
    semester: number;
    faculty: { user: { name: string | null } } | null;
  };
}

interface Quiz {
  id: string;
  title: string;
  courseId: string;
  duration: number;
  status: string;
  dueDate: string;
  questions: string[];
}

interface StudentDashboardResponse {
  stats?: {
    currentGpa?: number;
    currentGPA?: number;
    attendanceRate?: number;
    attendancePercent?: number;
    totalDues?: number;
    pendingDues?: number;
    totalCourses?: number;
    enrolledCourses?: number;
  };
  timetable?: TimetableEntry[];
  pendingQuizzes?: Quiz[];
  attendanceChartData?: Array<{
    course: string;
    present: number;
    absent: number;
    late: number;
  }>;
  gradeChartData?: Array<{
    course: string;
    quiz: number;
    assignment: number;
    mid: number;
    final: number;
  }>;
  studentProfile?: {
    department: string;
    discipline?: string | null;
    programLevel?: string;
    semester: number;
    part?: number | null;
    shift: string;
    blocked?: boolean;
    readmitRequested?: boolean;
    status?: string;
    rollNo?: string;
    cgpa?: number;
    obtainedMarks?: number | null;
    totalMarks?: number | null;
    part1Marks?: number | null;
    gradesheetUrl?: string | null;
    graduationDate?: string | null;
    enrollmentDate?: string;
  };
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const attendanceChartConfig = {
  present: { label: "Present", color: "var(--color-system-success)" },
  absent: { label: "Absent", color: "var(--color-system-danger)" },
  late: { label: "Late", color: "var(--color-system-warning)" },
} satisfies ChartConfig;

export function StudentDashboardHome() {
  const { user } = useUser();
  const router = useRouter();
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbName, setDbName] = useState<string | null>(null);
  const [dashboardData, setDashboardData] =
    useState<StudentDashboardResponse | null>(null);

  const studentStatus = dashboardData?.studentProfile?.status;
  const isGraduated = studentStatus === "Graduated" || studentStatus === "HSSC Completed";

  useEffect(() => {
    if (isGraduated) {
      router.replace("/dashboard/graduated");
    }
  }, [isGraduated, router]);

  const fetchDashboard = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [res, meRes] = await Promise.all([
        api.get<StudentDashboardResponse>("/api/dashboard/student"),
        api.get("/api/me").catch(() => null),
      ]);
      const data = res.data;
      if (meRes?.data?.name) {
        setDbName(meRes.data.name);
      }
      if (!data || (typeof data === "object" && "error" in data)) {
        setTimetable([]);
        setQuizzes([]);
        setDashboardData(null);
      } else {
        setTimetable(Array.isArray(data.timetable) ? data.timetable : []);
        setQuizzes(
          Array.isArray(data.pendingQuizzes) ? data.pendingQuizzes : [],
        );
        setDashboardData(data);
      }
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    fetchDashboard(true);
  };

  const pendingQuizzes = quizzes;

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const today = days[new Date().getDay()];
  const todayClasses = timetable.filter((t) => t.day === today);

  const attendanceChartData = dashboardData?.attendanceChartData || [];
  const gradeChartData = dashboardData?.gradeChartData || [];
  const stats = dashboardData?.stats;
  const currentGpa = stats?.currentGpa ?? stats?.currentGPA;
  const attendanceRate = stats?.attendanceRate ?? stats?.attendancePercent;
  const totalDues = stats?.totalDues ?? stats?.pendingDues;
  const totalCourses = stats?.totalCourses ?? stats?.enrolledCourses;

  const isInter = dashboardData?.studentProfile?.programLevel?.toUpperCase() === "INTERMEDIATE";

  const gradeChartConfig = {
    mid: { label: isInter ? "Obtained Marks" : "Midterm", color: "var(--color-data-3)" },
    sessional: { label: "Sessional", color: "var(--color-data-4)" },
  } satisfies ChartConfig;

  const displayName = dbName || user?.firstName || "Student";

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${displayName}! 👋`}
          subtitle="Here's your academic snapshot for today."
          action={
            <Button
              variant="outline"
              size="sm"
              disabled
              className="geo-pressable flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 shadow-[2px_2px_0px_0px_var(--border)] cursor-not-allowed opacity-50"
            >
              <RefreshCw className="h-4 w-4 animate-spin" />
              Refresh
            </Button>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TableSkeleton rows={5} />
          </div>
          <ListSkeleton count={3} />
        </div>
      </div>
    );
  }

  // If student is graduated / completed, render Alumni dashboard view
  if (isGraduated && dashboardData?.studentProfile) {
    return (
      <AlumniDashboardHome
        studentName={displayName}
        department={dashboardData.studentProfile.department}
        cgpa={dashboardData.studentProfile.cgpa ?? currentGpa ?? 3.8}
        rollNo={dashboardData.studentProfile.rollNo || "N/A"}
        gradesheetUrl={dashboardData.studentProfile.gradesheetUrl}
        graduationDate={dashboardData.studentProfile.graduationDate}
        enrollmentDate={dashboardData.studentProfile.enrollmentDate}
      />
    );
  }

  const gpaTrend =
    currentGpa === undefined || currentGpa === null
      ? "N/A"
      : currentGpa >= 3.5
      ? "Excellent"
      : currentGpa >= 3.0
      ? "Good"
      : "Needs Imp.";
  const gpaTrendDir =
    currentGpa === undefined || currentGpa === null || currentGpa >= 3.0 ? "up" : "down";

  const attendanceTrend =
    attendanceRate === undefined || attendanceRate === null
      ? "N/A"
      : attendanceRate >= 80
      ? "Good"
      : "Low";
  const attendanceTrendDir =
    attendanceRate === undefined || attendanceRate === null || attendanceRate >= 80 ? "up" : "down";

  const duesTrend = totalDues && totalDues > 0 ? "Pending" : "Cleared";
  const duesTrendDir = totalDues && totalDues > 0 ? "down" : "up";

  const quickActions = [
    {
      title: "View Courses",
      href: "/dashboard/my-courses",
      icon: BookOpen,
      iconColor: "var(--color-brand-primary)",
      iconBg: "rgb(var(--color-brand-primary-rgb) / 0.1)",
    },
    {
      title: "My Attendance",
      href: "/dashboard/my-attendance",
      icon: Clock,
      iconColor: "var(--color-system-success)",
      iconBg: "rgb(var(--color-system-success-rgb) / 0.1)",
    },
    {
      title: "Take a Quiz",
      href: "/dashboard/take-quiz",
      icon: FileText,
      iconColor: "var(--color-data-3)",
      iconBg: "color-mix(in oklab, var(--color-data-3) 10%, transparent)",
    },
    {
      title: "View Timetable",
      href: "/dashboard/my-timetable",
      icon: CalendarDays,
      iconColor: "var(--color-brand-secondary)",
      iconBg: "rgb(var(--color-brand-secondary-rgb) / 0.1)",
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {dashboardData?.studentProfile?.blocked && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl border-2 border-rose-500 bg-rose-500/10 dark:bg-rose-950/30 shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-rose-600 dark:text-rose-400 text-base">Account Struck Off (Attendance Shortage)</h4>
                <Badge variant="destructive" className="uppercase text-[10px] font-black">Suspended</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Your portal status has been set to <strong>Struck Off</strong> due to attendance shortage (below 75%). Interactive submissions and quiz attempts are restricted. Please contact your Department Head / Admin for re-admission.
              </p>
            </div>
          </div>
          {dashboardData.studentProfile.readmitRequested ? (
            <Badge className="bg-amber-500/20 text-amber-600 border border-amber-500/30 font-bold px-3 py-1.5 shrink-0 text-xs">
              Re-Admission Requested
            </Badge>
          ) : null}
        </motion.div>
      )}

      <PageHeader
        title={`Welcome, ${displayName}! 👋`}
        subtitle="Here's your academic snapshot for today."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="geo-pressable flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 shadow-[2px_2px_0px_0px_var(--border)] cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Stats */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <Link href="/dashboard/my-grades" className="block transition-transform hover:scale-[1.02]">
          {isInter ? (
            (() => {
              const profile = dashboardData.studentProfile;
              const isPart2 = (profile?.part === 2) || ((profile?.semester ?? 1) >= 2);
              const cardTitle = isPart2 ? "Part 1 Board Marks" : "Entrance Marks";
              
              let cardValue = "—";
              let percentLabel = "Academic Record";
              
              if (isPart2) {
                if (profile?.part1Marks !== undefined && profile?.part1Marks !== null) {
                  cardValue = `${profile.part1Marks} / 550`;
                  const pct = ((profile.part1Marks / 550) * 100).toFixed(1);
                  percentLabel = `${pct}% Score`;
                } else if (profile?.obtainedMarks !== undefined && profile?.obtainedMarks !== null && profile.obtainedMarks <= 550) {
                  cardValue = `${profile.obtainedMarks} / 550`;
                  const pct = ((profile.obtainedMarks / 550) * 100).toFixed(1);
                  percentLabel = `${pct}% Score`;
                }
              } else {
                if (profile?.obtainedMarks !== undefined && profile?.obtainedMarks !== null) {
                  const tot = profile.totalMarks || 1100;
                  cardValue = `${profile.obtainedMarks} / ${tot}`;
                  const pct = ((profile.obtainedMarks / tot) * 100).toFixed(1);
                  percentLabel = `${pct}% Score`;
                }
              }

              return (
                <StatsCard
                  title={cardTitle}
                  value={cardValue}
                  trend={percentLabel}
                  trendDirection="up"
                  trendLabel="Marks Record"
                  icon={GraduationCap}
                  iconColor="var(--color-brand-primary)"
                  iconBg="rgb(var(--color-brand-primary-rgb) / 0.1)"
                />
              );
            })()
          ) : (
            <StatsCard
              title="Previous CGPA"
              value={currentGpa === null || currentGpa === undefined ? "—" : currentGpa.toFixed(2)}
              trend={gpaTrend}
              trendDirection={gpaTrendDir}
              trendLabel="Academic Status"
              icon={GraduationCap}
              iconColor="var(--color-brand-primary)"
              iconBg="rgb(var(--color-brand-primary-rgb) / 0.1)"
            />
          )}
        </Link>
        <Link href="/dashboard/my-attendance" className="block transition-transform hover:scale-[1.02]">
          <StatsCard
            title="Attendance"
            value={attendanceRate === null || attendanceRate === undefined ? "—" : `${attendanceRate}%`}
            trend={attendanceTrend}
            trendDirection={attendanceTrendDir}
            trendLabel="Attendance Status"
            icon={Clock}
            iconColor="var(--color-system-success)"
            iconBg="rgb(var(--color-system-success-rgb) / 0.1)"
          />
        </Link>
        <Link href="/dashboard/my-dues" className="block transition-transform hover:scale-[1.02]">
          <StatsCard
            title="Pending Dues"
            value={totalDues !== undefined ? `PKR ${totalDues.toLocaleString()}` : "—"}
            trend={duesTrend}
            trendDirection={duesTrendDir}
            trendLabel="Dues Status"
            icon={CreditCard}
            iconColor="var(--color-system-danger)"
            iconBg="rgb(var(--color-system-danger-rgb) / 0.1)"
          />
        </Link>
        <Link href="/dashboard/my-courses" className="block transition-transform hover:scale-[1.02]">
          <StatsCard
            title="Enrolled Courses"
            value={totalCourses ?? timetable.length}
            trend="Active"
            trendDirection="up"
            trendLabel="Registration Status"
            icon={BookOpen}
            iconColor="var(--color-data-3)"
            iconBg="color-mix(in oklab, var(--color-data-3) 10%, transparent)"
          />
        </Link>
      </motion.div>

      {/* Charts */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Attendance Chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Link href="/dashboard/my-attendance" className="flex items-center justify-between text-sm font-semibold text-foreground mb-4 hover:text-brand-primary transition-colors group">
            <span>Attendance by Course</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <ChartContainer
            config={attendanceChartConfig}
            className="h-[200px] w-full"
          >
            <BarChart accessibilityLayer data={attendanceChartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="course"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="present"
                fill="var(--color-present)"
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
              <Bar
                dataKey="late"
                fill="var(--color-late)"
                radius={0}
                stackId="a"
              />
              <Bar
                dataKey="absent"
                fill="var(--color-absent)"
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Grade Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Link href="/dashboard/my-grades" className="flex items-center justify-between text-sm font-semibold text-foreground mb-4 hover:text-brand-primary transition-colors group">
            <span>Grade Breakdown</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <ChartContainer
            config={gradeChartConfig}
            className="h-[200px] w-full"
          >
            <BarChart accessibilityLayer data={gradeChartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="course"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="mid" fill="var(--color-mid)" radius={4} />
              {!isInter && <Bar dataKey="sessional" fill="var(--color-final)" radius={4} />}
            </BarChart>
          </ChartContainer>
        </div>
      </motion.div>

      {/* Bottom section */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Today's Classes */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Link href="/dashboard/my-courses" className="flex items-center justify-between text-sm font-semibold text-foreground mb-4 hover:text-brand-primary transition-colors group">
            <span>Today&apos;s Classes</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
          {todayClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No classes scheduled for today. 🎉
            </p>
          ) : (
            <div className="space-y-3">
              {todayClasses.map((cls, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg p-3 bg-accent/30 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10">
                    <BookOpen className="h-4 w-4 text-brand-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {cls.course.courseCode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cls.startTime} - {cls.endTime} • {cls.room}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Quizzes */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Upcoming Quizzes
            </h3>
            <Link
              href="/dashboard/take-quiz"
              className="text-xs text-brand-primary hover:underline"
            >
              View All
            </Link>
          </div>
          {pendingQuizzes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending quizzes. 🎯
            </p>
          ) : (
            <div className="space-y-3">
              {pendingQuizzes.slice(0, 3).map((quiz) => {
                const now = new Date();
                const daysLeft = Math.ceil(
                  (new Date(quiz.dueDate).getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                return (
                  <div
                    key={quiz.id}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                      <FileText className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {quiz.title}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Due: {new Date(quiz.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} till 11:59 PM
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="secondary"
                        className={
                          daysLeft <= 2
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 font-bold"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold"
                        }
                      >
                        {daysLeft <= 0 ? "Due Today" : `${daysLeft}d left`}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {quickActions.map((qa) => (
              <Link
                key={qa.title}
                href={qa.href}
                className="group flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent/50 transition-colors"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: qa.iconBg }}
                >
                  <qa.icon
                    className="h-3.5 w-3.5"
                    style={{ color: qa.iconColor }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground flex-1">
                  {qa.title}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
