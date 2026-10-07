"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/axios";
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Calendar, Eye } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsCardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type AttendanceStatus = "Present" | "Absent" | "Late" | "Not Marked Yet";

interface AttendanceRecord {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  status: AttendanceStatus;
  markedBy: string;
  student: { rollNo: string; user: { name: string | null } };
  course: { courseCode: string; courseName?: string };
}

interface CourseOption {
  id: string;
  courseCode: string;
  courseName: string;
}

const statusColors: Record<AttendanceStatus, string> = {
  Present:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Absent: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  Late: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Not Marked Yet":
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700",
};

const chartConfig = {
  present: { label: "Present", color: "var(--color-system-success)" },
  absent: { label: "Absent", color: "var(--color-system-danger)" },
  late: { label: "Late", color: "var(--color-system-warning)" },
} satisfies ChartConfig;

export default function MyAttendancePage() {
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state for 3-Month Course Attendance History
  const [selectedCourseModal, setSelectedCourseModal] = useState<CourseOption | null>(null);

  const fetchAttendanceData = useCallback(async () => {
    try {
      const [attRes, crsRes] = await Promise.all([
        api.get<AttendanceRecord[]>("/api/attendance"),
        api.get<CourseOption[]>("/api/courses"),
      ]);
      setAllAttendance(Array.isArray(attRes.data) ? attRes.data : []);
      setCourses(Array.isArray(crsRes.data) ? crsRes.data : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAttendanceData();
    setRefreshing(false);
  };

  // Map over all enrolled courses and return current day's (today's) attendance record
  const filtered = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return courses.map((c) => {
      const todayLog = allAttendance.find((a) => {
        if (a.courseId !== c.id) return false;
        const dStr = new Date(a.date).toISOString().split("T")[0];
        return dStr === todayStr;
      });

      if (todayLog) return todayLog;

      return {
        id: `today-${c.id}`,
        studentId: "me",
        courseId: c.id,
        date: new Date().toISOString(),
        status: "Not Marked Yet" as AttendanceStatus,
        markedBy: "System",
        student: { rollNo: "", user: { name: "" } },
        course: { courseCode: c.courseCode, courseName: c.courseName },
      };
    });
  }, [allAttendance, courses]);

  const presentCount = allAttendance.filter((a) => a.status === "Present").length;
  const absentCount = allAttendance.filter((a) => a.status === "Absent").length;
  const lateCount = allAttendance.filter((a) => a.status === "Late").length;
  const totalCount = allAttendance.length;
  const attendancePercent =
    totalCount > 0
      ? Math.round(((presentCount + lateCount) / totalCount) * 100)
      : 0;

  const chartData = courses.map((c) => {
    const courseAtt = allAttendance.filter((a) => a.courseId === c.id);
    return {
      course: c.courseCode,
      present: courseAtt.filter((a) => a.status === "Present").length,
      absent: courseAtt.filter((a) => a.status === "Absent").length,
      late: courseAtt.filter((a) => a.status === "Late").length,
    };
  });

  // Calculate 3-month (90 days) history for selected course
  const courseThreeMonthLogs = useMemo(() => {
    if (!selectedCourseModal) return [];
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return allAttendance
      .filter((a) => a.courseId === selectedCourseModal.id)
      .filter((a) => new Date(a.date) >= ninetyDaysAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCourseModal, allAttendance]);

  const columns: Column<AttendanceRecord>[] = [
    {
      key: "courseId",
      header: "Course",
      sortable: true,
      render: (row) => {
        const foundCourse = courses.find((c) => c.id === row.courseId);
        return (
          <span className="font-bold text-foreground">
            {foundCourse?.courseName || row.course?.courseName || "Course"} — {foundCourse?.courseCode || row.course?.courseCode || ""}
          </span>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (row) => (
        <span className="text-muted-foreground font-mono text-xs">
          {new Date(row.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant="secondary" className={statusColors[row.status] || "bg-muted text-muted-foreground"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "id",
      header: "Actions",
      render: (row) => {
        const foundCourse = courses.find((c) => c.id === row.courseId);
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (foundCourse) setSelectedCourseModal(foundCourse);
            }}
            className="h-8 text-xs gap-1 border-brand-primary/30 text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg"
            title="View attendance history for this course"
          >
            <Eye className="h-3.5 w-3.5" /> History
          </Button>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse border-2 border-border" />
          <div className="h-4 w-72 bg-muted animate-pulse border-2 border-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
        <ChartSkeleton />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        title="My Attendance"
        subtitle="Current daily attendance updates across enrolled courses"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "My Attendance" },
        ]}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="geo-pressable flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 shadow-[2px_2px_0px_0px_var(--border)] cursor-pointer rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Low Attendance Warning */}
      {attendancePercent < 75 && totalCount > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
              Low Attendance Warning
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400/80 mt-0.5">
              Your attendance is at {attendancePercent}%. Minimum 75% is
              required to be eligible for examinations.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Attendance %"
          value={`${attendancePercent}%`}
          trend={attendancePercent >= 75 ? "Good" : "Low"}
          trendDirection={attendancePercent >= 75 ? "up" : "down"}
          icon={Clock}
          iconColor="var(--color-brand-primary)"
          iconBg="rgb(var(--color-brand-primary-rgb) / 0.1)"
        />
        <StatsCard
          title="Present"
          value={presentCount}
          trend={`of ${totalCount}`}
          trendDirection="up"
          icon={CheckCircle}
          iconColor="var(--color-system-success)"
          iconBg="rgb(var(--color-system-success-rgb) / 0.1)"
        />
        <StatsCard
          title="Absent"
          value={absentCount}
          trend={`of ${totalCount}`}
          trendDirection="down"
          icon={XCircle}
          iconColor="var(--color-system-danger)"
          iconBg="rgb(var(--color-system-danger-rgb) / 0.1)"
        />
        <StatsCard
          title="Late"
          value={lateCount}
          trend={`of ${totalCount}`}
          trendDirection="down"
          icon={AlertCircle}
          iconColor="var(--color-system-warning)"
          iconBg="rgb(var(--color-system-warning-rgb) / 0.1)"
        />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Course-wise Attendance Breakdown
        </h3>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart accessibilityLayer data={chartData}>
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

      {/* Table */}
      <div className="bg-card/50 backdrop-blur-sm border rounded-xl overflow-hidden shadow-sm">
        <DataTable
          data={filtered as unknown as Record<string, unknown>[]}
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          searchPlaceholder="Search by course code, name, or date..."
        />
      </div>

      {/* 3-Month Course Attendance History Dialog */}
      <Dialog open={!!selectedCourseModal} onOpenChange={(open) => { if (!open) setSelectedCourseModal(null); }}>
        <DialogContent className="sm:max-w-[650px] border-none shadow-2xl overflow-hidden rounded-3xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-brand-primary via-brand-secondary to-brand-primary" />
          <DialogHeader className="pt-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-brand-primary" />
              90-Day Attendance History — {selectedCourseModal?.courseName} - {selectedCourseModal?.courseCode}
            </DialogTitle>
            <DialogDescription className="mt-1">
              Reviewing your past 90-day attendance report for <strong>{selectedCourseModal?.courseName}</strong> ({selectedCourseModal?.courseCode}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[60vh] overflow-y-auto pr-1">
            {courseThreeMonthLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No attendance records found for this course in the last 3 months.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Summary Stats Bar */}
                {(() => {
                  const total = courseThreeMonthLogs.length;
                  const presents = courseThreeMonthLogs.filter((h) => h.status === "Present").length;
                  const lates = courseThreeMonthLogs.filter((h) => h.status === "Late").length;
                  const absents = courseThreeMonthLogs.filter((h) => h.status === "Absent").length;
                  const rate = total > 0 ? Math.round(((presents + lates) / total) * 100) : 0;

                  return (
                    <div className="grid grid-cols-4 gap-3 p-3 bg-muted/30 rounded-2xl text-center">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Presents</p>
                        <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{presents}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Lates</p>
                        <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{lates}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Absents</p>
                        <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400">{absents}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Overall Rate</p>
                        <p className="text-lg font-extrabold text-brand-primary">{rate}%</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Compact Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-1">
                  {courseThreeMonthLogs.map((log) => {
                    const formattedDate = new Date(log.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <div
                        key={log.id}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                          log.status === "Present"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : log.status === "Late"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        <span className="font-sans font-medium text-foreground text-[11px]">{formattedDate}</span>
                        <span className="font-bold text-xs">
                          {log.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

