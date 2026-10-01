"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ClipboardCheck, CheckCircle, Users, RefreshCw, AlertTriangle, Eye, Calendar, Loader2 } from "lucide-react";
import { api } from "@/lib/axios";
import { getLocalTodayString } from "@/lib/utils";
import { useStoredState } from "@/hooks/useStoredState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui";
import { Label } from "@/components/ui/label";
import { useProgramLevel } from "@/context/program-level-context";

interface CourseOption {
  id: string;
  courseCode: string;
  courseName: string;
  department: string;
  discipline?: string;
  part?: number;
  semester: number;
}

interface StudentOption {
  id: string;
  rollNo: string;
  shift: string;
  blocked: boolean;
  readmitRequested?: boolean;
  user: { name: string | null };
}

type AttendanceStatus = "Present" | "Absent" | "Late";

interface StudentAttendance {
  student: StudentOption;
  status: AttendanceStatus;
}

interface StudentHistoryLog {
  id: string;
  date: string;
  status: AttendanceStatus;
  course: { courseCode: string; courseName?: string };
}

const statusStyles: Record<AttendanceStatus, { bg: string; active: string }> = {
  Present: { bg: "bg-muted hover:bg-emerald-500/10", active: "bg-emerald-500 text-white" },
  Absent: { bg: "bg-muted hover:bg-rose-500/10", active: "bg-rose-500 text-white" },
  Late: { bg: "bg-muted hover:bg-amber-500/10", active: "bg-amber-500 text-white" },
};

export default function MarkAttendancePage() {
  useUser();
  const { programLevel } = useProgramLevel();
  const isInter = programLevel === "INTERMEDIATE";

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedDept, setSelectedDept] = useStoredState("mark_att_dept", "");
  const [selectedSemester, setSelectedSemester] = useStoredState("mark_att_sem", "");
  const [selectedCourse, setSelectedCourse] = useStoredState("mark_att_course", "");
  const [selectedShift, setSelectedShift] = useStoredState("mark_att_shift", "morning");
  const [selectedDate, setSelectedDate] = useState(getLocalTodayString());
  const [attendanceData, setAttendanceData] = useState<StudentAttendance[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<StudentAttendance[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<{ day: string; shift?: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Student 90-day history modal
  const [historyStudent, setHistoryStudent] = useState<StudentOption | null>(null);
  const [historyLogs, setHistoryLogs] = useState<StudentHistoryLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [actionLoadingStudentId, setActionLoadingStudentId] = useState<string | null>(null);

  const handleStruckOffStudent = async (student: StudentOption) => {
    setActionLoadingStudentId(student.id);
    try {
      await api.patch(`/api/students/${student.id}`, { blocked: true, readmitRequested: false });
      setAttendanceData((prev) =>
        prev.map((item) =>
          item.student.id === student.id
            ? { ...item, student: { ...item.student, blocked: true, readmitRequested: false } }
            : item
        )
      );
    } catch (err) {
      console.error("Failed to strike off student:", err);
    } finally {
      setActionLoadingStudentId(null);
    }
  };

  const handleRequestReadmit = async (student: StudentOption) => {
    setActionLoadingStudentId(student.id);
    try {
      await api.patch(`/api/students/${student.id}`, { readmitRequested: true });
      setAttendanceData((prev) =>
        prev.map((item) =>
          item.student.id === student.id
            ? { ...item, student: { ...item.student, readmitRequested: true } }
            : item
        )
      );
    } catch (err) {
      console.error("Failed to request readmission:", err);
    } finally {
      setActionLoadingStudentId(null);
    }
  };

  // Fetch initial assigned courses list and set defaults
  const fetchCourses = useCallback(async () => {
    try {
      const res = await api.get<CourseOption[]>(`/api/courses?programLevel=${programLevel}`);
      const list = Array.isArray(res.data) ? res.data : [];
      setCourses(list);
      if (list.length > 0) {
        setSelectedDept((prevDept) => {
          const currentDept = prevDept && list.some((c) => (c.discipline || c.department) === prevDept) ? prevDept : (list[0].discipline || list[0].department);

          setSelectedSemester((prevSem) => {
            const deptSemesters = Array.from(
              new Set(list.filter((c) => (c.discipline || c.department) === currentDept).map((c) => c.part || c.semester))
            ).sort((a, b) => a - b);
            const currentSem =
              prevSem && deptSemesters.includes(Number(prevSem))
                ? prevSem
                : deptSemesters[0] !== undefined
                ? deptSemesters[0].toString()
                : "";

            setSelectedCourse((prevCourse) => {
              const matchingCourses = list.filter(
                (c) => (c.discipline || c.department) === currentDept && (c.part || c.semester) === Number(currentSem)
              );
              const currentCourse =
                prevCourse && matchingCourses.some((c) => c.id === prevCourse)
                  ? prevCourse
                  : matchingCourses[0]?.id || "";
              return currentCourse;
            });

            return currentSem;
          });

          return currentDept;
        });
      }
    } catch {
      /* ignore */
    }
  }, [programLevel, setSelectedDept, setSelectedSemester, setSelectedCourse]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Load students, attendance, & timetable schedule when selectedCourse or selectedDate changes
  const fetchCourseDetails = useCallback(async (courseId: string, dateStr: string) => {
    if (!courseId) {
      setAttendanceData([]);
      setTimetableEntries([]);
      return;
    }
    setLoadingStudents(true);
    setSubmitted(false);

    try {
      const [courseRes, attendanceRes, timetableRes] = await Promise.all([
        api.get<{ enrollments?: { blocked?: boolean; readmitRequested?: boolean; student: StudentOption }[] }>(`/api/courses/${courseId}`),
        api.get<{ studentId: string; status: AttendanceStatus }[]>(
          `/api/attendance?courseId=${courseId}&date=${dateStr}`
        ).catch(() => ({ data: [] })),
        api.get<{ day: string; shift?: string }[]>(`/api/timetable?courseId=${courseId}`).catch(() => ({ data: [] })),
      ]);

      const enrollments = courseRes.data.enrollments || [];
      const students = enrollments
        .map((e) => {
          if (!e.student) return null;
          const isBlocked = Boolean(e.student.blocked || e.blocked);
          const isReadmitReq = !isBlocked ? false : Boolean(e.student.readmitRequested || e.readmitRequested);
          return {
            ...e.student,
            blocked: isBlocked,
            readmitRequested: isReadmitReq,
          };
        })
        .filter(Boolean) as StudentOption[];

      const prevRecords = attendanceRes.data || [];
      const ttEntries = Array.isArray(timetableRes.data) ? timetableRes.data : [];

      setTimetableEntries(ttEntries);
      const statusMap = new Map(prevRecords.map((r) => [r.studentId, r.status]));

      const loadedList = students.map((s) => ({
        student: s,
        status: statusMap.get(s.id) || ("Present" as AttendanceStatus),
      }));
      setAttendanceData(loadedList);
      setSavedSnapshot(loadedList);
    } catch (err) {
      console.error("Failed to load attendance/students:", err);
      setAttendanceData([]);
      setSavedSnapshot([]);
      setTimetableEntries([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    fetchCourseDetails(selectedCourse, selectedDate);
  }, [selectedCourse, selectedDate, fetchCourseDetails]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCourses();
    if (selectedCourse) {
      await fetchCourseDetails(selectedCourse, selectedDate);
    }
    setRefreshing(false);
  };

  // Compute unique departments/disciplines from assigned courses
  const depts = Array.from(new Set(courses.map((c) => (c.discipline || c.department)))).sort();

  // Compute unique semesters/parts for chosen department/discipline
  const semesters = Array.from(
    new Set(
      courses
        .filter((c) => (c.discipline || c.department) === selectedDept)
        .map((c) => c.part || c.semester)
    )
  ).sort((a, b) => a - b);

  // Filter courses by department/discipline and semester/part
  const filteredCourses = courses.filter(
    (c) => (c.discipline || c.department) === selectedDept && (c.part || c.semester) === Number(selectedSemester)
  );

  // Determine day of week for selected date and verify if class is scheduled
  const selectedDayName = useMemo(() => {
    if (!selectedDate) return "";
    const dateObj = new Date(`${selectedDate}T00:00:00`);
    return dateObj.toLocaleDateString("en-US", { weekday: "long" });
  }, [selectedDate]);

  const isSunday = useMemo(() => {
    if (!selectedDate) return false;
    const dateObj = new Date(`${selectedDate}T00:00:00`);
    return dateObj.getDay() === 0;
  }, [selectedDate]);

  const hasScheduledClass = useMemo(() => {
    if (isSunday) return false;
    if (timetableEntries.length === 0) return false; // Strictly block marking when no timetable entry exists
    return timetableEntries.some((entry) => {
      const matchDay = entry.day.toLowerCase() === selectedDayName.toLowerCase();
      const matchShift =
        !entry.shift || selectedShift === "all" || entry.shift.toLowerCase() === selectedShift.toLowerCase();
      return matchDay && matchShift;
    });
  }, [timetableEntries, selectedDayName, selectedShift, isSunday]);

  const handleStudentClick = async (student: StudentOption) => {
    setHistoryStudent(student);
    setLoadingHistory(true);
    try {
      const res = await api.get<StudentHistoryLog[]>(`/api/attendance?studentId=${student.id}&courseId=${selectedCourse}`);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const logs = (Array.isArray(res.data) ? res.data : [])
        .filter((l) => new Date(l.date) >= ninetyDaysAgo)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistoryLogs(logs);
    } catch {
      setHistoryLogs([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData((prev) =>
      prev.map((item) => (item.student.id === studentId ? { ...item, status } : item))
    );
  };

  const markAll = (status: AttendanceStatus) => {
    setAttendanceData((prev) =>
      prev.map((item) => {
        // Only apply to current visible/filtered students
        const matchesShift =
          selectedShift === "all" ||
          item.student.shift?.toLowerCase() === selectedShift.toLowerCase();
        if (matchesShift) {
          return { ...item, status };
        }
        return item;
      })
    );
  };

  const handleSubmit = async () => {
    if (!selectedCourse || attendanceData.length === 0) return;
    setSubmitting(true);
    setSaveError(null);
    setSubmitted(false);
    try {
      await api.post("/api/attendance", {
        courseId: selectedCourse,
        date: selectedDate,
        records: attendanceData.map((a) => ({ studentId: a.student.id, status: a.status })),
      });
      setSavedSnapshot(attendanceData);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr.response?.data?.error ?? "Failed to save attendance.";
      setSaveError(`${msg} (Operation rolled back)`);
      if (savedSnapshot.length > 0) {
        setAttendanceData(savedSnapshot);
      }
      setTimeout(() => setSaveError(null), 6000);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter attendance by shift selection
  const filteredStudents = attendanceData.filter((item) => {
    if (selectedShift === "all") return true;
    return item.student.shift?.toLowerCase() === selectedShift.toLowerCase();
  });

  const presentCount = filteredStudents.filter((a) => a.status === "Present").length;
  const absentCount = filteredStudents.filter((a) => a.status === "Absent").length;
  const lateCount = filteredStudents.filter((a) => a.status === "Late").length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <PageHeader
        title="Mark Attendance"
        subtitle="Record student attendance for your courses"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Mark Attendance" }]}
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

      {/* Selectors */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{isInter ? "Discipline" : "Department"}</Label>
            <Select
              value={selectedDept}
              onValueChange={(val) => {
                setSelectedDept(val);
                setSelectedSemester("");
                setSelectedCourse("");
              }}
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder={isInter ? "Select Discipline" : "Select Department"} />
              </SelectTrigger>
              <SelectContent>
                {depts.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{isInter ? "Part" : "Semester"}</Label>
            <Select
              value={selectedSemester}
              onValueChange={(val) => {
                setSelectedSemester(val);
                setSelectedCourse("");
              }}
              disabled={!selectedDept}
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder={isInter ? "Select Part" : "Select Semester"} />
              </SelectTrigger>
              <SelectContent>
                {semesters.map((s) => (
                  <SelectItem key={s} value={s.toString()}>
                    {isInter ? `Part ${s}` : `Semester ${s}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Course</Label>
            <Select
              value={selectedCourse}
              onValueChange={(val) => setSelectedCourse(val)}
              disabled={!selectedSemester}
            >
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Select Course" />
              </SelectTrigger>
              <SelectContent>
                {filteredCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.courseCode} — {c.courseName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Shift Filter</Label>
              <Select value={selectedShift} onValueChange={(val) => setSelectedShift(val)}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="All Shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 bg-card border-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timetable Alignment / Sunday Warning */}
      {isSunday && selectedCourse ? (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-purple-700 dark:text-purple-400">
              Today is Sunday — Attendance Marking Disabled
            </p>
            <p className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-0.5">
              Attendance cannot be marked or modified on Sundays as campus is closed.
            </p>
          </div>
        </div>
      ) : !hasScheduledClass && selectedCourse ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
              No class scheduled for this dept, sem, and shift, so no attendance can be marked.
            </p>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
              According to the timetable, no lecture is scheduled for this course, department, semester, and shift on {selectedDayName}s.
            </p>
          </div>
        </div>
      ) : null}

      {/* Attendance List */}
      {loadingStudents ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          {selectedCourse && filteredStudents.length > 0 && (
            <>
              {/* Summary + Bulk Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                    <CheckCircle className="h-3 w-3" /> {presentCount} Present
                  </Badge>
                  <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                    {absentCount} Absent
                  </Badge>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {lateCount} Late
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => markAll("Present")} disabled={!hasScheduledClass || isSunday} className="text-emerald-600 border-2">
                    Mark All Present
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => markAll("Absent")} disabled={!hasScheduledClass || isSunday} className="text-rose-600 border-2">
                    Mark All Absent
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left py-3 px-4 font-semibold text-foreground w-12">#</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Student</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Roll No</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground w-24">Shift</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground w-28">History</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground w-64">Status</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground w-36">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((item, i) => (
                        <tr key={item.student.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                          <td className="py-3 px-4 text-muted-foreground font-medium">{i + 1}</td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{item.student.user.name ?? "—"}</span>
                              {item.student.blocked && (
                                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 uppercase font-bold tracking-wider animate-pulse">
                                  Struck Off
                                </Badge>
                              )}
                              {item.student.readmitRequested && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 uppercase font-bold tracking-wider bg-amber-500/20 text-amber-600 border border-amber-500/30">
                                  Pending Readmit
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-muted-foreground">{item.student.rollNo}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="secondary"
                              className={
                                item.student.shift?.toLowerCase() === "morning"
                                  ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                  : "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20"
                              }
                            >
                              {item.student.shift ?? "Morning"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStudentClick(item.student)}
                              className="h-8 text-xs gap-1 border-brand-primary/30 text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg"
                              title="View 90-day attendance history"
                            >
                              <Eye className="h-3.5 w-3.5" /> History
                            </Button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {(["Present", "Absent", "Late"] as AttendanceStatus[]).map((status) => (
                                <button
                                  key={status}
                                  disabled={!hasScheduledClass || isSunday}
                                  onClick={() => toggleStatus(item.student.id, status)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    item.status === status
                                      ? statusStyles[status].active
                                      : statusStyles[status].bg
                                  } ${(!hasScheduledClass || isSunday) ? "opacity-40 cursor-not-allowed" : ""}`}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.student.blocked ? (
                              item.student.readmitRequested ? (
                                <Badge variant="outline" className="text-[10px] py-1 px-2 bg-amber-500/10 text-amber-600 border-amber-500/30">
                                  Request Sent
                                </Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={actionLoadingStudentId === item.student.id}
                                  onClick={() => handleRequestReadmit(item.student)}
                                  className="h-8 text-xs text-amber-600 border-amber-500 hover:bg-amber-500 hover:text-white rounded-xl font-semibold gap-1 min-w-[130px]"
                                >
                                  {actionLoadingStudentId === item.student.id && (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  )}
                                  Request Readmit
                                </Button>
                              )
                            ) : (
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={actionLoadingStudentId === item.student.id}
                                onClick={() => handleStruckOffStudent(item.student)}
                                className="h-8 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white gap-1 min-w-[90px]"
                              >
                                {actionLoadingStudentId === item.student.id && (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                )}
                                Struck Off
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit */}
              <div className="flex flex-col items-end gap-2">
                {saveError && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-pulse">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}
                {submitted ? (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-5 w-5 animate-bounce" />
                    <span className="text-sm font-semibold">Attendance saved successfully!</span>
                  </div>
                ) : (
                  <Button onClick={handleSubmit} disabled={submitting || !hasScheduledClass || isSunday} className="gap-2 border-2">
                    <ClipboardCheck className="h-4 w-4" />
                    {submitting ? "Saving..." : "Save Attendance"}
                  </Button>
                )}
              </div>
            </>
          )}

          {selectedCourse && filteredStudents.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No students found matching current filters</p>
            </div>
          )}
        </>
      )}

      {/* Student 90-Day History Modal */}
      <Dialog open={!!historyStudent} onOpenChange={(open) => { if (!open) setHistoryStudent(null); }}>
        <DialogContent className="sm:max-w-[600px] border-none shadow-2xl overflow-hidden rounded-3xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-brand-primary via-brand-secondary to-brand-primary" />
          <DialogHeader className="pt-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-brand-primary" />
              90-Day Student Attendance History
            </DialogTitle>
            <DialogDescription className="mt-1">
              Reviewing past 90-day attendance record for <strong>{historyStudent?.user?.name}</strong> ({historyStudent?.rollNo}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[60vh] overflow-y-auto pr-1">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
              </div>
            ) : historyLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No attendance records found for this student in the last 90 days.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Concise Metrics Summary */}
                {(() => {
                  const total = historyLogs.length;
                  const presents = historyLogs.filter((h) => h.status === "Present").length;
                  const lates = historyLogs.filter((h) => h.status === "Late").length;
                  const absents = historyLogs.filter((h) => h.status === "Absent").length;
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

                {/* Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-1">
                  {historyLogs.map((log) => {
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

