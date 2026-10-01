"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useProgramLevel } from "@/context/program-level-context";
import { api } from "@/lib/axios";
import {
  Users,
  GraduationCap,
  BookOpen,
  UserPlus,
  ClipboardCheck,
  Calendar,
  ArrowRight,
  Bell,
  Shield,
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
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

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
  recentAnnouncements: {
    id: string;
    title: string;
    priority: string;
    date: string;
  }[];
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  adminId: string;
  adminName: string;
  createdAt: string;
}

interface AdminDashboardApiResponse {
  error?: string;
  stats?: Partial<AdminDashboardData["stats"]>;
  studentsPerDepartment?: AdminDashboardData["studentsPerDepartment"];
  attendanceOverview?: AdminDashboardData["attendanceOverview"];
  recentAnnouncements?: AdminDashboardData["recentAnnouncements"];
  recentAuditLogs?: AuditLogEntry[];
}

const quickActions = [
  {
    title: "Mark Attendance",
    href: "/dashboard/attendance",
    icon: ClipboardCheck,
    iconClass: "text-system-success",
    bgClass: "bg-system-success/10",
  },
  {
    title: "Create Announcement",
    href: "/dashboard/announcements",
    icon: Bell,
    iconClass: "text-system-warning",
    bgClass: "bg-system-warning/10",
  },
  {
    title: "Generate Timetable",
    href: "/dashboard/timetable",
    icon: Calendar,
    iconClass: "text-brand-secondary",
    bgClass: "bg-brand-secondary/10",
  },
];

const DEPT_COLORS = [
  "var(--color-data-1)",
  "var(--color-data-2)",
  "var(--color-data-3)",
  "var(--color-data-4)",
  "var(--color-data-5)",
  "var(--color-data-6)",
  "var(--color-data-7)",
  "var(--color-data-8)",
];

const barChartConfig: ChartConfig = {
  students: { label: "Students", color: "var(--color-data-1)" },
};

const doughnutConfig: ChartConfig = {
  present: { label: "Present", color: "var(--color-system-success)" },
  absent: { label: "Absent", color: "var(--color-system-danger)" },
  late: { label: "Late", color: "var(--color-system-warning)" },
};

const defaultData: AdminDashboardData = {
  stats: {
    totalStudents: 0,
    totalFaculty: 0,
    activeCourses: 0,
    pendingAdmissions: 0,
    totalFeeCollected: 0,
    totalFeePending: 0,
    attendanceRate: 0,
  },
  studentsPerDepartment: [],
  attendanceOverview: [],
  recentAnnouncements: [],
};

function normalizeAdminDashboardData(
  payload: AdminDashboardApiResponse | null | undefined,
): AdminDashboardData {
  const stats = payload?.stats;

  return {
    stats: {
      totalStudents: stats?.totalStudents ?? 0,
      totalFaculty: stats?.totalFaculty ?? 0,
      activeCourses: stats?.activeCourses ?? 0,
      pendingAdmissions: stats?.pendingAdmissions ?? 0,
      totalFeeCollected: stats?.totalFeeCollected ?? 0,
      totalFeePending: stats?.totalFeePending ?? 0,
      attendanceRate: stats?.attendanceRate ?? 0,
    },
    studentsPerDepartment: Array.isArray(payload?.studentsPerDepartment)
      ? payload.studentsPerDepartment
      : [],
    attendanceOverview: Array.isArray(payload?.attendanceOverview)
      ? payload.attendanceOverview
      : [],
    recentAnnouncements: Array.isArray(payload?.recentAnnouncements)
      ? payload.recentAnnouncements
      : [],
  };
}

export default function AdminDashboardHome() {
  const { programLevel } = useProgramLevel();
  const [data, setData] = useState<AdminDashboardData>(defaultData);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbName, setDbName] = useState<string | null>(null);

  const activeLevelRef = useRef(programLevel);
  activeLevelRef.current = programLevel;

  const fetchData = useCallback(async (isRefresh = false) => {
    const requestedLevel = programLevel;
    if (!isRefresh) setLoading(true);
    try {
      const [r, meRes] = await Promise.all([
        api.get<AdminDashboardApiResponse>(`/api/dashboard/admin?programLevel=${requestedLevel}`),
        api.get("/api/me").catch(() => null),
      ]);
      if (activeLevelRef.current !== requestedLevel) return;

      const payload = r.data;
      if (meRes?.data?.name) {
        setDbName(meRes.data.name);
      }
      if (payload.error) {
        setData(defaultData);
        setAuditLogs([]);
      } else {
        setData(normalizeAdminDashboardData(payload));
        setAuditLogs(
          Array.isArray(payload.recentAuditLogs) ? payload.recentAuditLogs : []
        );
      }
    } catch {
      if (activeLevelRef.current === requestedLevel) {
        setData(defaultData);
        setAuditLogs([]);
      }
    } finally {
      if (activeLevelRef.current === requestedLevel) {
        setLoading(false);
      }
    }
  }, [programLevel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData(true);
  };

  const barChartData = data.studentsPerDepartment.map((item, i) => ({
    department:
      item.department.length > 12
        ? item.department.slice(0, 10) + "…"
        : item.department,
    students: item.students,
    fill: DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  const pieData = data.attendanceOverview.map((item, i) => ({
    name: item.name,
    value: item.value,
    fill:
      [
        "var(--color-system-success)",
        "var(--color-system-danger)",
        "var(--color-system-warning)",
      ][i] ?? "var(--color-brand-secondary)",
  }));

  const welcomeSub = dbName
    ? `Welcome back, ${dbName}! Here's what's happening at your college today.`
    : "Welcome back! Here's what's happening at your college today.";

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Overview"
          subtitle={welcomeSub}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ListSkeleton count={3} />
          <TableSkeleton rows={5} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <PageHeader
        title="Dashboard Overview"
        subtitle={welcomeSub}
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

      {/* Stats Cards */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <Link href="/dashboard/students" className="block transition-transform hover:scale-[1.02]">
          <StatsCard
            title="Total Students"
            value={data.stats.totalStudents}
            trend="Enrolled"
            trendDirection="up"
            trendLabel="Current Status"
            icon={Users}
            iconColor="var(--color-brand-primary)"
            iconBg="rgb(var(--color-brand-primary-rgb) / 0.1)"
          />
        </Link>
        <Link href="/dashboard/faculty" className="block transition-transform hover:scale-[1.02]">
          <StatsCard
            title="Total Faculty"
            value={data.stats.totalFaculty}
            trend="Active"
            trendDirection="up"
            trendLabel="Current Status"
            icon={GraduationCap}
            iconColor="var(--color-brand-secondary)"
            iconBg="rgb(var(--color-brand-secondary-rgb) / 0.1)"
          />
        </Link>
        <Link href="/dashboard/courses" className="block transition-transform hover:scale-[1.02]">
          <StatsCard
            title="Active Courses"
            value={data.stats.activeCourses}
            trend="Offered"
            trendDirection="up"
            trendLabel="Current Status"
            icon={BookOpen}
            iconColor="var(--color-data-3)"
            iconBg="color-mix(in oklab, var(--color-data-3) 10%, transparent)"
          />
        </Link>
        <Link href="/dashboard/admissions" className="block transition-transform hover:scale-[1.02]">
          <StatsCard
            title="Pending Admissions"
            value={data.stats.pendingAdmissions}
            trend={data.stats.pendingAdmissions > 0 ? "Action Req." : "Clear"}
            trendDirection={data.stats.pendingAdmissions > 0 ? "down" : "up"}
            trendLabel="Admissions Status"
            icon={UserPlus}
            iconColor="var(--color-data-4)"
            iconBg="color-mix(in oklab, var(--color-data-4) 10%, transparent)"
          />
        </Link>
      </motion.div>

      {/* Charts */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Bar chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Link href="/dashboard/students" className="flex items-center justify-between text-sm font-semibold text-foreground mb-4 hover:text-brand-primary transition-colors group">
            <span>Students per Department</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <ChartContainer
            config={barChartConfig}
            className="min-h-[280px] w-full"
          >
            <BarChart accessibilityLayer data={barChartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="department"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="students" radius={[8, 8, 0, 0]}>
                {barChartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>

        {/* Doughnut chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Link href="/dashboard/attendance" className="flex items-center justify-between text-sm font-semibold text-foreground mb-4 hover:text-brand-primary transition-colors group">
            <span>Attendance Overview</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <ChartContainer
            config={doughnutConfig}
            className="min-h-[280px] w-full"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
              >
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        </div>
      </motion.div>

      {/* Bottom section: Recent Announcements + Quick Actions */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Recent Announcements */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <Link href="/dashboard/announcements" className="flex items-center justify-between text-sm font-semibold text-foreground mb-4 hover:text-brand-primary transition-colors group">
            <span>Recent Announcements</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <div className="space-y-3">
            {data.recentAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent announcements.
              </p>
            ) : (
              data.recentAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-start gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10">
                    <Bell className="h-4 w-4 text-brand-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{ann.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ann.priority} priority
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(ann.date).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {quickActions.map((qa) => (
              <Link
                key={qa.title}
                href={qa.href}
                className="group flex items-center gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${qa.bgClass}`}
                >
                  <qa.icon className={`h-4 w-4 ${qa.iconClass}`} />
                </div>
                <span className="text-sm font-medium text-foreground flex-1">
                  {qa.title}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>

          {/* Fee Summary */}
          <Link href="/dashboard/dues" className="mt-5 pt-4 border-t border-border block hover:opacity-80 transition-opacity group">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center justify-between">
              <span>Fee Summary</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Collected</span>
                <span className="text-sm font-semibold text-system-success">
                  PKR {data.stats.totalFeeCollected.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-sm font-semibold text-system-danger">
                  PKR {data.stats.totalFeePending.toLocaleString()}
                </span>
              </div>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Admin Activity Log */}
      {auditLogs.length > 0 && (
        <motion.div
          variants={item}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-brand-primary" />
              Recent Admin Activity
            </h3>
            <Link
              href="/dashboard/audit"
              className="text-xs text-brand-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {auditLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-accent/50 transition-colors"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                    log.action === "CREATED"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : log.action === "DELETED"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}
                >
                  {log.action.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {log.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    by <span className="font-medium">{log.adminName}</span> ·{" "}
                    {log.entity}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
