"use client";

import { useState, useEffect, useMemo } from "react";
import { useStoredState } from "@/hooks/useStoredState";
import { api } from "@/lib/axios";
import { getLocalTodayString } from "@/lib/utils";
import { ClipboardCheck, Eye, Loader2, Calendar, RefreshCw, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/ui";
import { useUser } from "@clerk/nextjs";
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
import { motion, AnimatePresence } from "framer-motion";
import { useProgramLevel } from "@/context/program-level-context";
import {
  getDisciplinesForLevel,
  getTermOptionsForLevel,
  formatTermLabel,
  getSubjectSetFilterConfig,
} from "@/lib/constants";

interface AttendanceWithDetails {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  status: "Present" | "Absent" | "Late";
  markedBy: string;
  student: {
    id: string;
    rollNo: string;
    department: string;
    semester: number;
    shift: string;
    user: { name: string | null };
  };
  course: { courseCode: string; courseName?: string };
}

interface StudentItem {
  id: string;
  userId: string;
  rollNo: string;
  phone: string | null;
  department: string;
  semester: number;
  shift: string;
  blocked: boolean;
  readmitRequested?: boolean;
  enrollments?: { id: string; courseId: string; blocked: boolean; readmitRequested: boolean }[];
  enrollmentDate: string;
  avatar: string | null;
  user: { name: string | null; email: string };
  _count?: { enrollments: number };
}

interface StudentStatsItem extends StudentItem {
  stats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    rate: number;
  };
}

interface CourseType {
  id: string;
  department: string;
  discipline?: string | null;
  semester: number;
  part?: number | null;
  courseCode: string;
  courseName: string;
}

const departmentIcons: Record<string, string> = {
  "Computer Science": "💻",
  "Mathematics": "📐",
  "Physics": "⚛️",
  "English": "📚",
  "Chemistry": "🧪",
  "Economics": "📊",
  "Urdu": "✍️",
  "Islamic Studies": "🕌",
};

interface TimetableItem {
  id: string;
  courseId: string;
  day: string;
  shift?: string;
}

export default function ManageAttendancePage() {
  const { user, isLoaded } = useUser();
  const { programLevel } = useProgramLevel();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceWithDetails[]>([]);
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [timetables] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Drill-down states with sessionStorage persistence
  const [selectedDept, setSelectedDept] = useStoredState<string | null>("admin_att_dept", null);
  const [selectedSemester, setSelectedSemester] = useStoredState<number | null>("admin_att_sem", null);
  const [selectedShift, setSelectedShift] = useStoredState<string>("admin_att_shift", "Morning");
  const [selectedSet, setSelectedSet] = useStoredState<string>("admin_att_set", "Set 1");

  // Detailed Log dialog
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentStatsItem | null>(null);
  const [selectedLogCourseId, setSelectedLogCourseId] = useState<string>("all");

  const role = useMemo(() => {
    const rawRole = user?.publicMetadata?.role as string | undefined;
    if (rawRole) {
      return rawRole.toLowerCase();
    }
    return "student";
  }, [user?.publicMetadata?.role]);

  const isAdmin = role === "admin";
  const isFaculty = role === "faculty";

  useEffect(() => {
    setSelectedDept(null);
    setSelectedSemester(null);
  }, [programLevel, setSelectedDept, setSelectedSemester]);

  useEffect(() => {
    if (isLoaded && isAdmin) {
      if (!selectedDept) setSelectedDept(getDisciplinesForLevel(programLevel)[0] || "Computer Science");
      if (!selectedSemester) setSelectedSemester(1);
    }
  }, [isLoaded, isAdmin, selectedDept, selectedSemester, programLevel, setSelectedDept, setSelectedSemester]);

  // Faculty Struck Off dialog states
  const [struckOffDialogOpen, setStruckOffDialogOpen] = useState(false);
  const [struckOffStudent, setStruckOffStudent] = useState<StudentStatsItem | null>(null);
  const [struckOffReason, setStruckOffReason] = useState("");
  const [submittingStruckOff, setSubmittingStruckOff] = useState(false);

  const handleStruckOffClick = (student: StudentStatsItem) => {
    if (isFaculty) {
      setStruckOffStudent(student);
      setStruckOffReason("");
      setStruckOffDialogOpen(true);
    } else {
      handleToggleBlock(student);
    }
  };

  const handleStruckOffSubmit = async () => {
    if (!struckOffStudent || !struckOffReason.trim()) return;
    setSubmittingStruckOff(true);
    try {
      // Find course enrollment for selected course if available
      const targetEnrollment = struckOffStudent.enrollments?.[0];
      if (targetEnrollment) {
        await api.patch(`/api/enrollments/${targetEnrollment.id}`, { blocked: true, readmitRequested: false });
      } else {
        await api.patch(`/api/students/${struckOffStudent.id}`, { blocked: true, readmitRequested: false });
      }
      
      // Post announcement warning notice targeting their class
      await api.post("/api/announcements", {
        title: "Warning Notice: Student Struck Off",
        content: `Student ${struckOffStudent.user?.name || "Unknown"} (${struckOffStudent.rollNo}) has been struck off from attendance logs by instructor. Reason: ${struckOffReason}`,
        audience: "Students",
        priority: "High",
        targetDepartment: struckOffStudent.department,
        targetSemester: struckOffStudent.semester,
      });

      // Update local state
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== struckOffStudent.id) return s;
          const updatedEnrollments = s.enrollments?.map((e) =>
            targetEnrollment && e.id === targetEnrollment.id ? { ...e, blocked: true, readmitRequested: false } : e
          );
          return { ...s, blocked: true, readmitRequested: false, enrollments: updatedEnrollments };
        })
      );
      if (selectedStudent && selectedStudent.id === struckOffStudent.id) {
        setSelectedStudent((prev) => (prev ? { ...prev, blocked: true, readmitRequested: false } : null));
      }
      setStruckOffDialogOpen(false);
      setStruckOffStudent(null);
      setStruckOffReason("");
    } catch (err) {
      console.error("Failed to strike off student:", err);
    } finally {
      setSubmittingStruckOff(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    Promise.all([
      api.get<StudentItem[]>("/api/students"),
      api.get<AttendanceWithDetails[]>("/api/attendance"),
      api.get<CourseType[]>("/api/courses").catch(() => ({ data: [] })),
    ])
      .then(([studentsRes, attendanceRes, coursesRes]) => {
        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
        setAttendance(Array.isArray(attendanceRes.data) ? attendanceRes.data : []);
        setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const [actionLoadingStudentId, setActionLoadingStudentId] = useState<string | null>(null);

  const handleToggleBlock = async (student: StudentStatsItem) => {
    const nextState = !student.blocked;
    setActionLoadingStudentId(student.id);
    try {
      await api.patch(`/api/students/${student.id}`, { blocked: nextState, readmitRequested: false });
      if (student.enrollments) {
        await Promise.all(
          student.enrollments.map((e) =>
            api.patch(`/api/enrollments/${e.id}`, { blocked: nextState, readmitRequested: false })
          )
        );
      }
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== student.id) return s;
          const updatedEnrollments = s.enrollments?.map((e) => ({ ...e, blocked: nextState, readmitRequested: false }));
          return { ...s, blocked: nextState, readmitRequested: false, enrollments: updatedEnrollments };
        })
      );
      if (selectedStudent && selectedStudent.id === student.id) {
        setSelectedStudent((prev) => (prev ? { ...prev, blocked: nextState, readmitRequested: false } : null));
      }
    } catch (err) {
      console.error("Failed to toggle student blocked status:", err);
    } finally {
      setActionLoadingStudentId(null);
    }
  };

  const handleRequestReadmission = async (student: StudentStatsItem) => {
    setActionLoadingStudentId(student.id);
    try {
      const targetEnrollment = student.enrollments?.[0];
      if (targetEnrollment) {
        await api.patch(`/api/enrollments/${targetEnrollment.id}`, { readmitRequested: true });
      }
      await api.patch(`/api/students/${student.id}`, { readmitRequested: true });
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== student.id) return s;
          const updatedEnrollments = s.enrollments?.map((e) =>
            targetEnrollment && e.id === targetEnrollment.id ? { ...e, readmitRequested: true } : e
          );
          return { ...s, readmitRequested: true, enrollments: updatedEnrollments };
        })
      );
      if (selectedStudent && selectedStudent.id === student.id) {
        setSelectedStudent((prev) => (prev ? { ...prev, readmitRequested: true } : null));
      }
    } catch (err) {
      console.error("Failed to request re-admission:", err);
    } finally {
      setActionLoadingStudentId(null);
    }
  };

  const visibleDepartments = useMemo(() => {
    const list = getDisciplinesForLevel(programLevel);
    if (isAdmin) return list;
    if (isFaculty) {
      const facultyDepts = new Set(
        courses.map((c) =>
          programLevel === "INTERMEDIATE" ? c.discipline || c.department : c.department
        )
      );
      return list.filter((dept) => facultyDepts.has(dept));
    }
    return list.filter((dept) => students.some((s) => s.department === dept));
  }, [isAdmin, isFaculty, courses, students, programLevel]);

  const visibleSemesters = useMemo(() => {
    const allSemesters = getTermOptionsForLevel(programLevel);
    if (isAdmin) return allSemesters;
    if (isFaculty) {
      const facultySemesters = new Set(
        courses
          .filter((c) =>
            programLevel === "INTERMEDIATE"
              ? (c.discipline || c.department) === selectedDept
              : c.department === selectedDept
          )
          .map((c) => (programLevel === "INTERMEDIATE" ? c.part ?? c.semester : c.semester))
      );
      return allSemesters.filter((sem) => facultySemesters.has(sem));
    }
    return allSemesters.filter((sem) =>
      students.some((s) => s.department === selectedDept && s.semester === sem)
    );
  }, [isAdmin, isFaculty, courses, selectedDept, students, programLevel]);

  // Filter students in the selected class/shift
  const classStudents = useMemo(() => {
    if (!selectedDept || !selectedSemester) return [];
    return students.filter((s) => {
      const matchesDept = s.department === selectedDept;
      const matchesSem = s.semester === selectedSemester;
      const matchesShift = programLevel === "BS" ? s.shift === selectedShift : true;

      if (programLevel === "INTERMEDIATE") {
        const setConfig = getSubjectSetFilterConfig(selectedDept || "");
        const activeSet = setConfig.hasMultipleSets ? (selectedSet || "Set 1") : "Set 1";
        const matchesSet = !(s as { subjectSet?: string }).subjectSet || (s as { subjectSet?: string }).subjectSet?.toLowerCase() === activeSet.toLowerCase();
        return matchesDept && matchesSem && matchesSet;
      }

      return matchesDept && matchesSem && matchesShift;
    });
  }, [students, selectedDept, selectedSemester, selectedShift, selectedSet, programLevel]);

  // Selected student state for top stats boxes
  const [selectedStudentForStatsId, setSelectedStudentForStatsId] = useState<string | null>(null);

  const studentStats = useMemo(() => {
    return classStudents.map((student) => {
      const studentLogs = attendance.filter((a) => a.studentId === student.id);
      const total = studentLogs.length;
      const present = studentLogs.filter((a) => a.status === "Present").length;
      const absent = studentLogs.filter((a) => a.status === "Absent").length;
      const late = studentLogs.filter((a) => a.status === "Late").length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      return {
        ...student,
        stats: {
          total,
          present,
          absent,
          late,
          rate,
        },
      };
    });
  }, [classStudents, attendance]);

  const activeStatsStudent = useMemo(() => {
    if (studentStats.length === 0) return null;
    if (selectedStudentForStatsId) {
      const found = studentStats.find((s) => s.id === selectedStudentForStatsId);
      if (found) return found;
    }
    return studentStats[0];
  }, [studentStats, selectedStudentForStatsId]);

  const [filterDate, setFilterDate] = useState<string>(getLocalTodayString());

  // Unique courses for selected student
  const studentCourses = useMemo(() => {
    if (!selectedStudent) return [];
    if (selectedStudent.enrollments && selectedStudent.enrollments.length > 0) {
      const enrolledCourseIds = new Set(selectedStudent.enrollments.map((e) => e.courseId));
      const enrolled = courses.filter((c) => enrolledCourseIds.has(c.id));
      if (enrolled.length > 0) return enrolled;
    }
    return courses.filter(
      (c) => c.department === selectedStudent.department && c.semester === selectedStudent.semester
    );
  }, [selectedStudent, courses]);

  // Fetch present day attendance for all enrolled courses, or 90-day detailed logs for a selected course
  const selectedStudentTodayStatusList = useMemo(() => {
    if (!selectedStudent || selectedLogCourseId !== "all") return [];
    const todayStr = new Date().toISOString().split("T")[0];
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayDayName = days[new Date().getDay()];
    const isSunday = new Date().getDay() === 0;

    return studentCourses.map((c) => {
      const log = attendance.find(
        (a) =>
          a.studentId === selectedStudent.id &&
          a.courseId === c.id &&
          new Date(a.date).toISOString().split("T")[0] === todayStr
      );

      const hasClassToday = !isSunday && timetables.some((t) => {
        const matchCourse = t.courseId === c.id;
        const matchDay = t.day.toLowerCase() === todayDayName.toLowerCase();
        const matchShift = !t.shift || t.shift.toLowerCase() === selectedStudent.shift?.toLowerCase();
        return matchCourse && matchDay && matchShift;
      });

      let calculatedStatus = "Not Marked Yet";
      if (log) {
        calculatedStatus = log.status;
      } else if (isSunday || (timetables.length > 0 && !hasClassToday)) {
        calculatedStatus = "No Class Today";
      }

      return {
        courseId: c.id,
        courseCode: c.courseCode,
        courseName: c.courseName,
        logId: log?.id ?? null,
        status: calculatedStatus,
        date: todayStr,
      };
    });
  }, [selectedStudent, attendance, studentCourses, timetables, selectedLogCourseId]);

  const selectedStudentLogs = useMemo(() => {
    if (!selectedStudent || selectedLogCourseId === "all") return [];

    // Specific course selected: 90 days history regardless of date filter
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return attendance
      .filter((a) => {
        if (a.studentId !== selectedStudent.id) return false;
        if (a.courseId !== selectedLogCourseId) return false;
        if (new Date(a.date) < ninetyDaysAgo) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedStudent, attendance, selectedLogCourseId]);

  const columns: Column<StudentStatsItem>[] = [
    {
      key: "user",
      header: "Student",
      sortable: true,
      render: (row) => {
        const pct = row.stats.total > 0 ? Math.round(((row.stats.present + row.stats.late) / row.stats.total) * 100) : 0;
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">
                {row.user?.name ?? "—"}
              </span>
              {pct < 75 && !row.blocked && (
                <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] py-0 px-1.5 uppercase font-bold tracking-wider">
                  Shortage Alert ({pct}%)
                </Badge>
              )}
              {row.blocked && (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 uppercase font-bold tracking-wider animate-pulse">
                  Struck Off
                </Badge>
              )}
              {row.readmitRequested && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 uppercase font-bold tracking-wider bg-amber-500/20 text-amber-600 border border-amber-500/30">
                  Pending Re-Admission
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono">{row.rollNo}</p>
          </div>
        );
      },
    },
    {
      key: "totalLectures" as keyof StudentStatsItem,
      header: "Total Lectures",
      render: (row) => (
        <span className="font-mono font-bold text-foreground">
          {row.stats.total} {row.stats.total === 1 ? "Lec" : "Lecs"}
        </span>
      ),
    },
    {
      key: "present",
      header: "Present",
      render: (row) => (
        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
          {row.stats.present}
        </span>
      ),
    },
    {
      key: "late",
      header: "Late",
      render: (row) => (
        <span className="text-amber-600 dark:text-amber-400 font-bold">
          {row.stats.late}
        </span>
      ),
    },
    {
      key: "absent",
      header: "Absent",
      render: (row) => (
        <span className="text-rose-600 dark:text-rose-400 font-bold">
          {row.stats.absent}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Attendance Rate",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm min-w-10">{row.stats.rate}%</span>
          <div className="w-24 bg-muted h-2 rounded-full overflow-hidden shrink-0">
            <div
              className={`h-full transition-all duration-500 ${
                row.stats.rate >= 75
                  ? "bg-emerald-500"
                  : row.stats.rate >= 60
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${row.stats.rate}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStudent(row);
              setSelectedStudentForStatsId(row.id);
              setLogDialogOpen(true);
            }}
            className="h-8 text-xs gap-1 border-brand-primary/20 hover:bg-brand-primary hover:text-white transition-all rounded-lg"
          >
            <Eye className="h-3.5 w-3.5" />
            View Logs
          </Button>

          {row.blocked ? (
            isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoadingStudentId === row.id || !row.readmitRequested}
                onClick={() => handleToggleBlock(row)}
                className={`h-8 text-xs gap-1 rounded-lg border-emerald-500 font-bold min-w-[140px] ml-2 ${
                  row.readmitRequested
                    ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white cursor-pointer"
                    : "opacity-50 cursor-not-allowed text-muted-foreground border-muted"
                }`}
                title={
                  row.readmitRequested
                    ? "Approve Re-admission / Activate Student"
                    : "Re-admission request required from faculty first"
                }
              >
                {actionLoadingStudentId === row.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                Re-Admit Student
              </Button>
            ) : row.readmitRequested ? (
              <Badge variant="outline" className="text-xs py-1 px-2 bg-amber-500/10 text-amber-600 border-amber-500/30">
                Re-Admission Requested
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoadingStudentId === row.id}
                onClick={() => handleRequestReadmission(row)}
                className="h-8 text-xs gap-1 rounded-lg border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white font-semibold min-w-[140px]"
              >
                {actionLoadingStudentId === row.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Request Re-Admission
              </Button>
            )
          ) : isFaculty ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={submittingStruckOff}
              onClick={() => handleStruckOffClick(row)}
              className={`h-8 text-xs gap-1 rounded-lg ${
                row.stats.rate < 75
                  ? "bg-rose-600 hover:bg-rose-700 border-none text-white font-bold"
                  : ""
              }`}
            >
              Struck Off
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title={
          isAdmin
            ? "Manage Attendance"
            : selectedDept === null
            ? "Manage Attendance"
            : selectedSemester === null
            ? selectedDept
            : `${selectedDept} - ${formatTermLabel(programLevel, selectedSemester)}`
        }
        subtitle={
          isAdmin
            ? "Track and audit attendance histories across departments"
            : selectedDept === null
            ? "Track and audit attendance histories across departments"
            : selectedSemester === null
            ? programLevel === "INTERMEDIATE"
              ? "Select a part to inspect student stats"
              : "Select a semester to inspect student stats"
            : `Class Attendance Details (${selectedShift} Shift)`
        }
        breadcrumbs={
          isAdmin
            ? [
                { label: "Dashboard", href: "/dashboard" },
                { label: "Attendance" },
              ]
            : [
                { label: "Dashboard", href: "/dashboard" },
                ...(selectedDept === null
                  ? [{ label: "Attendance" }]
                  : [
                      {
                        label: "Attendance",
                        onClick: () => {
                          setSelectedDept(null);
                          setSelectedSemester(null);
                        },
                      },
                      ...(selectedSemester === null
                        ? [{ label: selectedDept }]
                        : [
                            {
                              label: selectedDept,
                              onClick: () => {
                                setSelectedSemester(null);
                              },
                            },
                            { label: formatTermLabel(programLevel, selectedSemester) },
                          ]),
                    ]),
              ]
        }
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 shadow-[2px_2px_0px_0px_var(--border)] cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--border)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_var(--border)] transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <AnimatePresence mode="wait">
        {!isLoaded || loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TableSkeleton rows={10} />
          </motion.div>
        ) : selectedDept === null ? (
          /* Department Selection View */
          <motion.div
            key="departments"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {visibleDepartments.map((dept) => {
              const count = students.filter((s) => s.department === dept).length;
              return (
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className="cursor-pointer p-6 bg-card border-2 border-border rounded-2xl shadow-sm hover:shadow-md hover:border-brand-primary transition-all duration-200 flex flex-col justify-between h-40 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-bl-full flex items-center justify-center text-4xl opacity-50 group-hover:scale-110 transition-transform duration-300">
                    {departmentIcons[dept] || "🎓"}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-brand-primary transition-colors">
                      {dept}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {programLevel === "INTERMEDIATE" ? "Discipline" : "Department"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm font-semibold bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-full">
                      {count} {count === 1 ? "Student" : "Students"}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : selectedSemester === null ? (
          /* Semester Selection View */
          <motion.div
            key="semesters"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setSelectedDept(null)}
                className="rounded-xl border-2"
              >
                {programLevel === "INTERMEDIATE" ? "← Back to Disciplines" : "← Back to Departments"}
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {visibleSemesters.map((sem) => {
                const count = students.filter(
                  (s) => s.department === selectedDept && s.semester === sem
                ).length;
                return (
                  <motion.div
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    key={sem}
                    onClick={() => setSelectedSemester(sem)}
                    className="cursor-pointer p-6 bg-card border-2 border-border rounded-2xl shadow-sm hover:shadow-md hover:border-brand-primary transition-all duration-200 flex flex-col justify-between h-36 group relative overflow-hidden"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {formatTermLabel(programLevel, sem)}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Active Class</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs font-semibold bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full">
                        {count} {count === 1 ? "Student" : "Students"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* Student Attendance Table with Stats & Shift Dropdown */
          <motion.div
            key="details"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Top Panel Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {isAdmin ? (
                <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border border-border w-full">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">
                      {programLevel === "INTERMEDIATE" ? "Discipline:" : "Dept:"}
                    </Label>
                    <Select value={selectedDept || ""} onValueChange={setSelectedDept}>
                      <SelectTrigger className="w-[180px] h-10 bg-card rounded-xl">
                        <SelectValue placeholder={programLevel === "INTERMEDIATE" ? "Select Discipline" : "Select Department"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getDisciplinesForLevel(programLevel).map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">
                      {programLevel === "INTERMEDIATE" ? "Part:" : "Sem:"}
                    </Label>
                    <Select
                      value={String(selectedSemester || 1)}
                      onValueChange={(v) => setSelectedSemester(Number(v))}
                    >
                      <SelectTrigger className="w-[140px] h-10 bg-card rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getTermOptionsForLevel(programLevel).map((s) => (
                          <SelectItem key={s} value={String(s)}>
                            {formatTermLabel(programLevel, s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {programLevel === "INTERMEDIATE" && getSubjectSetFilterConfig(selectedDept || "").hasMultipleSets && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Subject Set:</Label>
                      <Select value={selectedSet || "Set 1"} onValueChange={setSelectedSet}>
                        <SelectTrigger className="w-[140px] h-10 bg-card rounded-xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getSubjectSetFilterConfig(selectedDept || "").availableSets.map((set) => (
                            <SelectItem key={set} value={set}>
                              {set}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {programLevel === "BS" && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Shift:</Label>
                      <Select value={selectedShift} onValueChange={setSelectedShift}>
                        <SelectTrigger className="w-[120px] h-10 bg-card rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Morning">Morning</SelectItem>
                          <SelectItem value="Evening">Evening</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSemester(null)}
                    className="rounded-xl border-2"
                  >
                    ← Back to Semesters
                  </Button>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-muted-foreground uppercase">Shift:</span>
                    <Select value={selectedShift} onValueChange={setSelectedShift}>
                      <SelectTrigger className="w-[150px] h-10 border-2 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Morning">Morning</SelectItem>
                        <SelectItem value="Evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Selected Student Stats Summary Panel */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-5 bg-card border-2 border-border rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-sm font-semibold text-muted-foreground uppercase">Total Lectures</span>
                  <span className="text-3xl font-extrabold text-foreground mt-2">
                    {activeStatsStudent ? activeStatsStudent.stats.total : 0}
                  </span>
                </div>
                <div className="p-5 bg-card border-2 border-border rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-sm font-semibold text-muted-foreground uppercase">Attendance Rate</span>
                  <span className="text-3xl font-extrabold text-brand-primary mt-2">
                    {activeStatsStudent ? activeStatsStudent.stats.rate : 0}%
                  </span>
                </div>
                <div className="p-5 bg-card border-2 border-border rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-sm font-semibold text-muted-foreground uppercase">Presents / Lates</span>
                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                    {activeStatsStudent ? activeStatsStudent.stats.present : 0}{" "}
                    <span className="text-lg font-medium text-muted-foreground">
                      / {activeStatsStudent ? activeStatsStudent.stats.late : 0}
                    </span>
                  </span>
                </div>
                <div className="p-5 bg-card border-2 border-border rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-sm font-semibold text-muted-foreground uppercase">Absents</span>
                  <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
                    {activeStatsStudent ? activeStatsStudent.stats.absent : 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Student Table */}
            <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm p-4">
              <DataTable
                data={studentStats}
                columns={columns}
                searchPlaceholder="Search by student name or roll no..."
                onRowClick={(row) => setSelectedStudentForStatsId(row.id)}
                selectedRowKey={(row) => activeStatsStudent?.id === row.id}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed Logs Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="sm:max-w-[600px] border-none shadow-2xl overflow-hidden rounded-3xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-brand-primary via-brand-secondary to-brand-primary" />
          <DialogHeader className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <ClipboardCheck className="h-6 w-6 text-brand-primary" />
                  90-Day Student Attendance History
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Reviewing 90-day attendance record for <strong>{selectedStudent?.user?.name}</strong> ({selectedStudent?.rollNo}){selectedStudentLogs[0]?.course?.courseCode ? ` in course ${selectedStudentLogs[0].course.courseCode}` : ""}.
                </DialogDescription>
              </div>

              {/* Course & Date Filters */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Select value={selectedLogCourseId} onValueChange={setSelectedLogCourseId}>
                  <SelectTrigger className="h-9 w-44 text-xs rounded-xl bg-card">
                    <SelectValue placeholder="Current day attendance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Current day attendance</SelectItem>
                    {studentCourses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.courseCode} — {c.courseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterDate(e.target.value)}
                  className="h-9 w-32 text-xs rounded-xl font-mono"
                  title="Filter by date"
                />
                {filterDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterDate("")}
                    className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Course Attendance & Struck Off Threshold Guard */}
            {selectedStudent && selectedStudentLogs.length > 0 && (() => {
              const activeCourseCode = selectedStudentLogs[0]?.course.courseCode;
              const activeCourseId = selectedStudentLogs[0]?.courseId;
              const totalLogs = selectedStudentLogs.length;
              const presentLogs = selectedStudentLogs.filter(l => l.status === "Present" || l.status === "Late").length;
              const coursePct = totalLogs > 0 ? Math.round((presentLogs / totalLogs) * 100) : 0;

              const enrollment = selectedStudent.enrollments?.find(e => e.courseId === activeCourseId);
              const isStruckOffCourse = enrollment ? enrollment.blocked : selectedStudent.blocked;
              const isReadmitReqCourse = enrollment ? enrollment.readmitRequested : selectedStudent.readmitRequested;

              const handleEnrollmentStrikeOff = async () => {
                if (!enrollment) {
                  handleStruckOffClick(selectedStudent);
                  return;
                }
                setSubmittingStruckOff(true);
                try {
                  await api.patch(`/api/enrollments/${enrollment.id}`, { blocked: true });
                  await api.post("/api/announcements", {
                    title: `Warning Notice: Student Struck Off in ${activeCourseCode}`,
                    content: `Student ${selectedStudent.user?.name || "Unknown"} (${selectedStudent.rollNo}) has been struck off in ${activeCourseCode} due to ${coursePct}% attendance (<70%).`,
                    audience: "Students",
                    priority: "High",
                    targetDepartment: selectedStudent.department,
                    targetSemester: selectedStudent.semester,
                  });
                  setStudents((prev) =>
                    prev.map((s) =>
                      s.id === selectedStudent.id
                        ? {
                            ...s,
                            enrollments: s.enrollments?.map((e) =>
                              e.id === enrollment.id ? { ...e, blocked: true } : e
                            ),
                          }
                        : s
                    )
                  );
                  setSelectedStudent((prev) =>
                    prev
                      ? {
                          ...prev,
                          enrollments: prev.enrollments?.map((e) =>
                            e.id === enrollment.id ? { ...e, blocked: true } : e
                          ),
                        }
                      : null
                  );
                } catch (err) {
                  console.error("Failed to strike off for course:", err);
                } finally {
                  setSubmittingStruckOff(false);
                }
              };

              const handleEnrollmentReadmitRequest = async () => {
                if (!enrollment) return;
                try {
                  await api.patch(`/api/enrollments/${enrollment.id}`, { readmitRequested: true });
                  setStudents((prev) =>
                    prev.map((s) =>
                      s.id === selectedStudent.id
                        ? {
                            ...s,
                            enrollments: s.enrollments?.map((e) =>
                              e.id === enrollment.id ? { ...e, readmitRequested: true } : e
                            ),
                          }
                        : s
                    )
                  );
                  setSelectedStudent((prev) =>
                    prev
                      ? {
                          ...prev,
                          enrollments: prev.enrollments?.map((e) =>
                            e.id === enrollment.id ? { ...e, readmitRequested: true } : e
                          ),
                        }
                      : null
                  );
                } catch (err) {
                  console.error("Failed to request course re-admission:", err);
                }
              };

              return (
                <div className="mb-4 p-4 rounded-2xl bg-card border-2 border-border flex flex-wrap items-center justify-between gap-4 shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {activeCourseCode} Course Attendance
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xl font-extrabold ${coursePct >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {coursePct}%
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({presentLogs}/{totalLogs} lectures attended)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isStruckOffCourse ? (
                      isReadmitReqCourse ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-xs py-1 px-3 font-bold animate-pulse">
                          Course Re-Admission Requested
                        </Badge>
                      ) : isFaculty ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEnrollmentReadmitRequest}
                          className="h-8 text-xs text-amber-600 border-amber-500 hover:bg-amber-500 hover:text-white rounded-xl font-semibold"
                        >
                          Request Course Re-Admission
                        </Button>
                      ) : (
                        <Badge variant="destructive" className="text-xs py-1 px-3 uppercase font-bold">
                          Struck Off for Course
                        </Badge>
                      )
                    ) : isFaculty ? (
                      <div className="flex flex-col items-end gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={coursePct >= 70 || submittingStruckOff}
                          onClick={handleEnrollmentStrikeOff}
                          className="h-8 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={coursePct >= 70 ? "Can only strike off if course attendance is below 70%" : "Strike off student for this course"}
                        >
                          {submittingStruckOff && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                          Strike Off ({activeCourseCode})
                        </Button>
                        {coursePct >= 70 && (
                          <span className="text-[10px] text-muted-foreground italic">
                            Required &lt;70% to Strike Off (Current: {coursePct}%)
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })()}

            {selectedLogCourseId === "all" ? (
              /* Today's Present Day Attendance list across enrolled courses */
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-xs text-brand-primary font-semibold flex items-center justify-between">
                  <span>Today&apos;s Enrolled Courses Attendance</span>
                  <span className="font-mono">{new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                {selectedStudentTodayStatusList.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No enrolled courses found for this student class.</p>
                ) : (
                  selectedStudentTodayStatusList.map((item) => (
                    <div key={item.courseId} className="p-4 bg-accent/40 border border-border rounded-2xl flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {item.courseCode}{item.courseName ? ` - ${item.courseName}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 mt-1">
                          <Calendar className="h-3 w-3" />
                          {new Date().toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            item.status === "Present"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold"
                              : item.status === "Late"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold"
                              : item.status === "Absent"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-bold"
                              : item.status === "No Class Today"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold"
                              : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 font-semibold"
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : selectedStudentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No attendance records found for this course.</p>
            ) : (
              <div className="space-y-3">
                {/* 90-Day Compact P, A, L Grid View */}
                {(() => {
                  const total = selectedStudentLogs.length;
                  const presents = selectedStudentLogs.filter((h) => h.status === "Present").length;
                  const lates = selectedStudentLogs.filter((h) => h.status === "Late").length;
                  const absents = selectedStudentLogs.filter((h) => h.status === "Absent").length;
                  const rate = total > 0 ? Math.round(((presents + lates) / total) * 100) : 0;

                  return (
                    <div className="grid grid-cols-4 gap-3 p-3 bg-muted/30 rounded-2xl text-center mb-3">
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

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-1">
                  {selectedStudentLogs.map((log) => {
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

      {/* Faculty Struck Off Dialog */}
      <Dialog open={struckOffDialogOpen} onOpenChange={(open) => { if (!submittingStruckOff) setStruckOffDialogOpen(open); }}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl overflow-hidden rounded-3xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-destructive" />
          <DialogHeader className="pt-6">
            <DialogTitle className="text-xl font-bold text-destructive">
              Struck Off Student
            </DialogTitle>
            <DialogDescription>
              Provide a reason for striking off <strong>{struckOffStudent?.user?.name}</strong> ({struckOffStudent?.rollNo}). A warning notice will be posted to the class.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="grid gap-2">
              <label htmlFor="reason" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Notice / Struck Off Reason
              </label>
              <textarea
                id="reason"
                disabled={submittingStruckOff}
                value={struckOffReason}
                onChange={(e) => setStruckOffReason(e.target.value)}
                placeholder="e.g., Consecutive absences / Shortage of attendance"
                className="min-h-[100px] w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pb-6">
            <Button
              variant="ghost"
              disabled={submittingStruckOff}
              onClick={() => setStruckOffDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleStruckOffSubmit}
              disabled={submittingStruckOff || !struckOffReason.trim()}
              className="rounded-xl flex items-center gap-2"
            >
              {submittingStruckOff && <Loader2 className="h-4 w-4 animate-spin" />}
              {submittingStruckOff ? "Submitting..." : "Strike Off Student"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

