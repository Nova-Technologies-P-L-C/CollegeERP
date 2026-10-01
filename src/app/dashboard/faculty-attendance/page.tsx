"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/axios";
import {
  CalendarCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  UserCheck,
  Edit3,
  Calendar as CalendarIcon,
  RefreshCw,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { CardSkeleton, TableSkeleton } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn, getLocalTodayString } from "@/lib/utils";

type AttendanceStatus = "Present" | "Absent" | "Late";

interface FacultyItem {
  facultyId: string;
  name: string;
  email: string;
  avatar: string | null;
  department: string;
  specialization: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  markedBy: string;
  notes: string | null;
  attendanceId: string | null;
}

interface FacultyTodayRecord {
  id: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  notes: string | null;
}

interface FacultyHistoryItem {
  id: string;
  date: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  markedBy: string;
  notes: string | null;
}

const statusBadgeClass: Record<AttendanceStatus, string> = {
  Present: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  Late: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  Absent: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
};

import { DEPARTMENTS as SYSTEM_DEPARTMENTS } from "@/lib/constants";

const DEPARTMENTS = ["ALL", ...SYSTEM_DEPARTMENTS];

interface Compact90DayHistory {
  id: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}

export default function FacultyAttendancePage() {
  const [role, setRole] = useState<"ADMIN" | "FACULTY" | "STUDENT" | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Date filter (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayString());
  const [selectedDept, setSelectedDept] = useState<string>("ALL");

  // Admin view state
  const [facultyList, setFacultyList] = useState<FacultyItem[]>([]);
  const [overrideFaculty, setOverrideFaculty] = useState<FacultyItem | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<AttendanceStatus>("Present");
  const [overrideNotes, setOverrideNotes] = useState<string>("");
  const [savingOverride, setSavingOverride] = useState(false);

  // 3-Month Compact History Modal states
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedFacultyForHistory, setSelectedFacultyForHistory] = useState<FacultyItem | null>(null);
  const [faculty90DayHistory, setFaculty90DayHistory] = useState<Compact90DayHistory[]>([]);
  const [loading90Days, setLoading90Days] = useState(false);

  // Faculty view state
  const [todayRecord, setTodayRecord] = useState<FacultyTodayRecord | null>(null);
  const [history, setHistory] = useState<FacultyHistoryItem[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // Get current user role
      const meRes = await api.get("/api/me");
      const userRole = meRes.data?.role as "ADMIN" | "FACULTY" | "STUDENT";
      setRole(userRole);

      if (userRole === "ADMIN") {
        const res = await api.get<{ faculty: FacultyItem[] }>(
          `/api/faculty/attendance?date=${selectedDate}&department=${selectedDept}`
        );
        setFacultyList(res.data.faculty ?? []);
      } else if (userRole === "FACULTY") {
        const res = await api.get<{
          todayRecord: FacultyTodayRecord | null;
          history: FacultyHistoryItem[];
        }>("/api/faculty/attendance");
        setTodayRecord(res.data.todayRecord);
        setHistory(res.data.history ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch faculty attendance data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, selectedDept]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Faculty Check In / Check Out
  const handleFacultySelfCheck = async (action: "CHECK_IN" | "CHECK_OUT") => {
    setCheckingIn(true);
    try {
      const res = await api.post("/api/faculty/attendance", { action });
      if (res.data.success) {
        showToast(
          action === "CHECK_IN"
            ? "Checked in successfully! Have a great teaching day."
            : "Checked out successfully! See you next class."
        );
        fetchData(true);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      showToast(axiosErr.response?.data?.error ?? "Check-in failed", false);
    } finally {
      setCheckingIn(false);
    }
  };

  // Handle Admin Status Override
  const handleAdminOverrideSubmit = async () => {
    if (!overrideFaculty) return;
    setSavingOverride(true);
    try {
      const res = await api.post("/api/faculty/attendance/admin", {
        facultyId: overrideFaculty.facultyId,
        date: selectedDate,
        status: overrideStatus,
        notes: overrideNotes,
      });

      if (res.data.success) {
        showToast(`Attendance updated for ${overrideFaculty.name}`);
        setOverrideFaculty(null);
        fetchData(true);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      showToast(axiosErr.response?.data?.error ?? "Failed to update attendance", false);
    } finally {
      setSavingOverride(false);
    }
  };

  const open3MonthHistory = async (fac: FacultyItem) => {
    setSelectedFacultyForHistory(fac);
    setLoading90Days(true);
    setHistoryModalOpen(true);
    try {
      const res = await api.get<Compact90DayHistory[]>(
        `/api/faculty/attendance/history?facultyId=${fac.facultyId}`
      );
      setFaculty90DayHistory(res.data ?? []);
    } catch (err) {
      console.error("Failed to load 90 day faculty attendance history:", err);
      setFaculty90DayHistory([]);
    } finally {
      setLoading90Days(false);
    }
  };

  // Stats calculation for Admin view
  const presentCount = facultyList.filter((f) => f.status === "Present").length;
  const lateCount = facultyList.filter((f) => f.status === "Late").length;
  const absentCount = facultyList.filter((f) => f.status === "Absent").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        title="Faculty Attendance Management"
        subtitle={
          role === "ADMIN"
            ? "Monitor daily faculty presence across departments and update records with official audit logs"
            : "Record your daily campus check-in / check-out and view your attendance history"
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Faculty Attendance" },
        ]}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 border border-border rounded-xl"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <TableSkeleton rows={6} />
        </div>
      ) : role === "FACULTY" ? (
        /* ─── FACULTY VIEW: Self Check-In / History ─── */
        <div className="space-y-6">
          {/* Check-In Card */}
          <div className="rounded-3xl border border-border bg-gradient-to-br from-card to-muted/30 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Today&apos;s Attendance Status
                </h2>
                <p className="text-sm font-semibold text-brand-primary">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
                
                {new Date().getDay() === 0 ? (
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                    Today is Sunday — Campus is off today. Enjoy your day!
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground max-w-lg">
                    {todayRecord?.checkInTime
                      ? `Checked in at ${new Date(todayRecord.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "You have not checked in yet today. Click the button below to register your presence."}
                  </p>
                )}
              </div>

              {/* Status Badge + Actions */}
              {new Date().getDay() === 0 ? (
                <Badge variant="outline" className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                  Sunday Off
                </Badge>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {todayRecord && (
                    <Badge
                      variant="secondary"
                      className={cn("px-4 py-2 text-sm font-semibold rounded-xl border", statusBadgeClass[todayRecord.status])}
                    >
                      {todayRecord.status === "Present" && <CheckCircle2 className="h-4 w-4 mr-1.5 shrink-0" />}
                      {todayRecord.status === "Late" && <Clock className="h-4 w-4 mr-1.5 shrink-0" />}
                      {todayRecord.status}
                    </Badge>
                  )}

                  {!todayRecord?.checkInTime ? (
                    <Button
                      onClick={() => handleFacultySelfCheck("CHECK_IN")}
                      disabled={checkingIn || refreshing}
                      className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 gap-2 disabled:opacity-50 disabled:pointer-events-none text-xs"
                    >
                      {checkingIn ? (
                        <>
                          <div className="h-4 w-4 animate-spin border-2 border-white/40 border-t-white rounded-full shrink-0" />
                          <span>Checking in...</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4" />
                          <span>Check In Now</span>
                        </>
                      )}
                    </Button>
                  ) : !todayRecord?.checkOutTime ? (
                    <Button
                      onClick={() => handleFacultySelfCheck("CHECK_OUT")}
                      disabled={checkingIn || refreshing}
                      variant="outline"
                      className="h-11 px-6 rounded-xl border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/10 font-bold gap-2 disabled:opacity-50 disabled:pointer-events-none text-xs"
                    >
                      {checkingIn ? (
                        <>
                          <div className="h-4 w-4 animate-spin border-2 border-brand-primary/40 border-t-brand-primary rounded-full shrink-0" />
                          <span>Checking out...</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4" />
                          <span>Check Out</span>
                        </>
                      )}
                    </Button>
                  ) : (
                    <Badge variant="outline" className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      Completed for Today
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Faculty Attendance History */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-brand-primary" />
              Attendance History (Past 30 Days)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Status</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Check-In</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Check-Out</th>
                    <th className="text-left py-3 px-3 font-semibold text-foreground">Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground">
                        No previous attendance records found.
                      </td>
                    </tr>
                  ) : (
                    history.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">
                          {new Date(item.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant="secondary" className={statusBadgeClass[item.status]}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-muted-foreground">
                          {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-muted-foreground">
                          {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">
                          {item.markedBy === "SELF" ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Self Check-In</span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">Admin Override</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ─── ADMIN VIEW: Master Oversight Grid & Override ─── */
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard
              title="Present Faculty"
              value={presentCount}
              trend="On Campus"
              trendDirection="up"
              icon={CheckCircle2}
              iconColor="#10b981"
              iconBg="#10b98120"
            />
            <StatsCard
              title="Late Arrival"
              value={lateCount}
              trend="After 9:15 AM"
              trendDirection="down"
              icon={AlertCircle}
              iconColor="#f59e0b"
              iconBg="#f59e0b20"
            />
            <StatsCard
              title="Absent / Unmarked"
              value={absentCount}
              trend="No check-in"
              trendDirection="down"
              icon={XCircle}
              iconColor="#ef4444"
              iconBg="#ef444420"
            />
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
              {/* Date Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <CalendarCheck2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-10 rounded-xl font-mono text-xs w-full sm:w-44"
                />
              </div>

              {/* Department Filter */}
              <div className="w-full sm:w-52">
                <Select value={selectedDept} onValueChange={(v) => setSelectedDept(v)}>
                  <SelectTrigger className="h-10 rounded-xl text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="All Departments" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept === "ALL" ? "All Departments" : dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-right w-full sm:w-auto">
              Total Faculty: <strong>{facultyList.length}</strong>
            </p>
          </div>

          {/* Faculty Master Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Faculty Member</th>
                    <th className="text-left py-3 px-3 font-semibold text-foreground">Department</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Status</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Check-In</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Check-Out</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Log Type</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">3-Month Logs</th>
                    <th className="text-center py-3 px-4 font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facultyList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-muted-foreground">
                        No faculty records match the selected date and filters.
                      </td>
                    </tr>
                  ) : (
                    facultyList.map((fac, idx) => (
                      <motion.tr
                        key={fac.facultyId}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.25 }}
                        className="border-b border-border/50 hover:bg-accent/20 transition-colors"
                      >
                        {/* Name + email */}
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-semibold text-foreground">{fac.name}</p>
                            <p className="text-xs text-muted-foreground">{fac.email}</p>
                          </div>
                        </td>

                        {/* Dept */}
                        <td className="py-3 px-3 text-xs text-muted-foreground font-medium">
                          {fac.department}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <Badge variant="secondary" className={cn("px-3 py-1 font-semibold", statusBadgeClass[fac.status])}>
                            {fac.status}
                          </Badge>
                        </td>

                        {/* Check In */}
                        <td className="py-3 px-3 text-center font-mono text-xs text-muted-foreground">
                          {fac.checkInTime ? new Date(fac.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>

                        {/* Check Out */}
                        <td className="py-3 px-3 text-center font-mono text-xs text-muted-foreground">
                          {fac.checkOutTime ? new Date(fac.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>

                        {/* Log Type */}
                        <td className="py-3 px-3 text-center text-xs text-muted-foreground">
                          {fac.markedBy === "SELF" ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Self Check-In</span>
                          ) : fac.markedBy !== "SYSTEM" ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">Admin Override</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* 3-Month History Column */}
                        <td className="py-3 px-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg gap-1 text-xs border-brand-primary/30 text-brand-primary hover:bg-brand-primary hover:text-white transition-all"
                            onClick={() => open3MonthHistory(fac)}
                            title="View 3-month attendance history"
                          >
                            <Eye className="h-3.5 w-3.5" /> 3-Mo Log
                          </Button>
                        </td>

                        {/* Edit Status Action Column */}
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg gap-1 text-xs"
                            onClick={() => {
                              setOverrideFaculty(fac);
                              setOverrideStatus(fac.status);
                              setOverrideNotes(fac.notes ?? "");
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit Status
                          </Button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Override Dialog */}
          <Dialog open={!!overrideFaculty} onOpenChange={(open) => { if (!savingOverride) setOverrideFaculty(open ? overrideFaculty : null); }}>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <Edit3 className="h-5 w-5 text-brand-primary" />
                  Override Faculty Attendance
                </DialogTitle>
              </DialogHeader>

              {overrideFaculty && (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border">
                    <p className="font-semibold text-foreground">{overrideFaculty.name}</p>
                    <p className="text-xs text-muted-foreground">{overrideFaculty.department} • {overrideFaculty.email}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-1">Date: {selectedDate}</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Attendance Status
                    </label>
                    <Select disabled={savingOverride} value={overrideStatus} onValueChange={(v) => setOverrideStatus(v as AttendanceStatus)}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Present">Present</SelectItem>
                        <SelectItem value="Late">Late</SelectItem>
                        <SelectItem value="Absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Notes / Reason for Override
                    </label>
                    <Input
                      disabled={savingOverride}
                      placeholder="e.g. Official leave approved / Manual check-in adjustment"
                      value={overrideNotes}
                      onChange={(e) => setOverrideNotes(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50">
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      Note: Saving an Admin Override will update the record and log an entry in the system Audit Trail.
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" disabled={savingOverride} onClick={() => setOverrideFaculty(null)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={handleAdminOverrideSubmit}
                  disabled={savingOverride}
                  className="bg-brand-primary text-white hover:opacity-90 rounded-xl gap-2 min-w-[120px]"
                >
                  {savingOverride ? (
                    <>
                      <div className="h-4 w-4 animate-spin border-2 border-white/40 border-t-white rounded-full shrink-0" />
                      Saving Override…
                    </>
                  ) : (
                    "Save Override"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* 3-Month Compact History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto rounded-3xl border-none shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-brand-primary via-purple-500 to-brand-primary" />
          <DialogHeader className="pt-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-brand-primary" />
              3-Month Attendance Log — {selectedFacultyForHistory?.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Department: <strong>{selectedFacultyForHistory?.department}</strong> • Specialization: {selectedFacultyForHistory?.specialization}
            </p>
          </DialogHeader>

          {loading90Days ? (
            <div className="py-12 flex justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-brand-primary" />
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Summary Stats */}
              {(() => {
                const total = faculty90DayHistory.length;
                const presents = faculty90DayHistory.filter((h) => h.status === "Present").length;
                const lates = faculty90DayHistory.filter((h) => h.status === "Late").length;
                const absents = faculty90DayHistory.filter((h) => h.status === "Absent").length;
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

              {/* 90 Days Records List Grid */}
              <div className="max-h-[350px] overflow-y-auto rounded-2xl border border-border p-3 space-y-2">
                {faculty90DayHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No attendance records found for past 90 days.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {faculty90DayHistory.map((item) => {
                      const dateObj = new Date(item.date);
                      const formattedDate = dateObj.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      });

                      return (
                        <div
                          key={item.id}
                          className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                            item.status === "Present"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : item.status === "Late"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          <span className="font-sans font-medium text-foreground text-[11px]">{formattedDate}</span>
                          <span className="font-bold text-xs">
                            {item.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl text-sm font-medium",
              toast.ok ? "bg-emerald-600 text-white" : "bg-destructive text-destructive-foreground"
            )}
          >
            {toast.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
