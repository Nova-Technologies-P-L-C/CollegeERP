"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import {
  Plus,
  Pencil,
  Trash2,
  UserMinus,
  Laptop,
  Calculator,
  Atom,
  BookOpen,
  FlaskConical,
  Coins,
  PenTool,
  Book,
  ChevronRight,
  ArrowLeft,
  GraduationCap,
  Loader2,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Sun,
  Moon,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { useProgramLevel } from "@/context/program-level-context";
import {
  DEPARTMENTS,
  getDisciplinesForLevel,
  getTermOptionsForLevel,
  formatTermLabel,
  getSubjectSetsForDiscipline,
  formatCourseCode,
  getSubjectSetFilterConfig,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { TableSkeleton } from "@/components/ui";

interface CourseWithDetails {
  id: string;
  courseCode: string;
  courseName: string;
  creditHours: number;
  totalMarks?: number | null;
  department: string;
  semester: number;
  programLevel?: string;
  discipline?: string | null;
  part?: number | null;
  subjectSet?: string | null;
  assignedFaculty: string | null;
  assignedFacultyMorning?: string | null;
  assignedFacultyEvening?: string | null;
  shift: string;
  faculty: { user: { name: string | null }; department: string } | null;
  facultyMorning?: { user: { name: string | null }; department: string } | null;
  facultyEvening?: { user: { name: string | null }; department: string } | null;
  _count: { enrollments: number };
}

interface FacultyOption {
  id: string;
  user: { name: string | null };
  department: string;
}

interface CourseForm {
  courseCode: string;
  courseName: string;
  creditHours: number;
  totalMarks: number;
  department: string;
  semester: number;
  subjectSet: string;
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

const emptyCourse: CourseForm = {
  courseCode: "",
  courseName: "",
  creditHours: 3,
  totalMarks: 100,
  department: "",
  semester: 1,
  subjectSet: "Set 1",
};

const departmentMeta: Record<string, { icon: typeof Laptop; color: string; bg: string; border: string }> = {
  "Computer Science": {
    icon: Laptop,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-100 dark:border-blue-900/30"
  },
  "Mathematics": {
    icon: Calculator,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-100 dark:border-purple-900/30"
  },
  "Physics": {
    icon: Atom,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/30"
  },
  "English": {
    icon: BookOpen,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/30"
  },
  "Chemistry": {
    icon: FlaskConical,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/20",
    border: "border-rose-100 dark:border-rose-900/30"
  },
  "Economics": {
    icon: Coins,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/20",
    border: "border-cyan-100 dark:border-cyan-900/30"
  },
  "Urdu": {
    icon: PenTool,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-100 dark:border-orange-900/30"
  },
  "Islamic Studies": {
    icon: Book,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/20",
    border: "border-teal-100 dark:border-teal-900/30"
  }
};

const defaultMeta = {
  icon: Book,
  color: "text-zinc-600 dark:text-zinc-400",
  bg: "bg-zinc-50 dark:bg-zinc-950/20",
  border: "border-zinc-100 dark:border-zinc-900/30"
};

export default function ManageCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseWithDetails | null>(
    null,
  );
  const [deletingCourse, setDeletingCourse] =
    useState<CourseWithDetails | null>(null);
  const [assigningCourse, setAssigningCourse] =
    useState<CourseWithDetails | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyCourse);
  const [selectedFaculty, setSelectedFaculty] = useState<string>("");
  const [selectedAssignShift, setSelectedAssignShift] = useState<string>("Morning");
  const [assigning, setAssigning] = useState(false);
  const [unassigningShiftKey, setUnassigningShiftKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Detail Dialog states
  const [viewingCourse, setViewingCourse] = useState<CourseWithDetails | null>(null);
  const [courseAuditLogs, setCourseAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Drill-down states
  const { programLevel } = useProgramLevel();
  const [selectedDept, setSelectedDept] = useState<string | null>("Computer Science");
  const [selectedSem, setSelectedSem] = useState<number | null>(1);
  const [selectedSet, setSelectedSet] = useState<string | null>("all");

  useEffect(() => {
    if (programLevel === "INTERMEDIATE") {
      setSelectedDept("F.Sc Pre-Medical");
      setSelectedSem(1);
      setSelectedSet("all");
    } else {
      setSelectedDept("Computer Science");
      setSelectedSem(1);
      setSelectedSet("all");
    }
  }, [programLevel]);

  // Bulk Upload states
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [rawCsvText, setRawCsvText] = useState("");
  const [previewRows, setPreviewRows] = useState<Array<{
    rowNum: number;
    courseCode: string;
    courseName: string;
    creditHours: number;
    department: string;
    semester: number;
    shift: string;
    status: "valid" | "missing" | "invalid_credits" | "invalid_sem" | "invalid_dept" | "duplicate";
    reason?: string;
  }>>([]);
  const [importingBulk, setImportingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ imported: number; skipped: Array<{ row: number; reason: string }> } | null>(null);

  // Bulk Delete states
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [purgeScope, setPurgeScope] = useState<"specific" | "department" | "entire">("specific");
  const [purgeDept, setPurgeDept] = useState<string>("Computer Science");
  const [purgeSem, setPurgeSem] = useState<string>("1");
  const [purgeConfirmInput, setPurgeConfirmInput] = useState("");

  const targetCoursesCount = courses.filter((c) => {
    if (purgeScope === "entire") return true;
    if (purgeScope === "department") return c.department === purgeDept;
    if (purgeScope === "specific") return c.department === purgeDept && c.semester === Number(purgeSem);
    return false;
  }).length;

  const handleDeleteAllCourses = async () => {
    setDeletingAll(true);
    try {
      let url = "/api/courses";
      if (purgeScope === "entire") {
        url += "?all=true";
      } else if (purgeScope === "department") {
        url += `?department=${encodeURIComponent(purgeDept)}&semester=all`;
      } else {
        url += `?department=${encodeURIComponent(purgeDept)}&semester=${purgeSem}`;
      }

      await api.delete(url);
      setDeleteAllDialogOpen(false);
      setPurgeConfirmInput("");
      handleRefresh();
      router.refresh();
    } catch (err) {
      console.error("Failed to bulk delete courses:", err);
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "courseCode,courseName,creditHours,department,semester,shift\n" +
      "CS-301,Database Systems,3,Computer Science,3,Morning\n" +
      "CS-302,Data Structures & Algorithms,4,Computer Science,3,Morning\n" +
      "MTH-101,Calculus & Analytical Geometry,3,Mathematics,1,Morning\n" +
      "PHY-201,Applied Physics,3,Physics,2,Morning\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "courses_sample_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseAndPreviewTextContent = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setPreviewRows([]);
      return;
    }

    const headers = parseCSVRow(lines[0]).map((h) => h.toLowerCase().trim());
    const col = (name: string): number => headers.indexOf(name);

    const existingSet = new Set(
      courses.map((c) => `${c.courseCode.toUpperCase()}|${c.department.toLowerCase()}`)
    );
    const batchSet = new Set<string>();
    const rows: typeof previewRows = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVRow(lines[i]);
      const get = (name: string) => (cells[col(name)] ?? "").trim();

      const code = get("coursecode");
      const name = get("coursename");
      const credits = Number(get("credithours"));
      const dept = get("department");
      const sem = Number(get("semester"));
      const shift = get("shift") || "Morning";
      const codeUpper = code.toUpperCase();
      const pairKey = `${codeUpper}|${dept.toLowerCase()}`;

      let status: (typeof previewRows)[number]["status"] = "valid";
      let reason: string | undefined = undefined;

      if (!code || !name || !dept) {
        status = "missing";
        reason = "Missing required fields";
      } else if (!Number.isInteger(credits) || credits < 1 || credits > 6) {
        status = "invalid_credits";
        reason = "Credits must be 1-6";
      } else if (!Number.isInteger(sem) || sem < 1 || sem > 8) {
        status = "invalid_sem";
        reason = "Semester must be 1-8";
      } else if (!DEPARTMENTS.some((d) => d.toLowerCase() === dept.toLowerCase())) {
        status = "invalid_dept";
        reason = "Unknown department";
      } else if (existingSet.has(pairKey) || batchSet.has(pairKey)) {
        status = "duplicate";
        reason = existingSet.has(pairKey) ? "Code exists in department" : "Duplicate code in batch";
      }

      if (status === "valid") {
        batchSet.add(pairKey);
      }

      rows.push({
        rowNum: i + 1,
        courseCode: code,
        courseName: name,
        creditHours: credits,
        department: dept,
        semester: sem,
        shift,
        status,
        reason,
      });
    }

    setPreviewRows(rows);
  };

  const parseAndPreviewCSV = async (file: File) => {
    setBulkFile(file);
    const text = await file.text();
    parseAndPreviewTextContent(text);
  };

  const handleRawTextChange = (text: string) => {
    setRawCsvText(text);
    parseAndPreviewTextContent(text);
  };

  const handleConfirmImport = async () => {
    if (!bulkFile && previewRows.length === 0) return;
    setImportingBulk(true);
    setBulkResult(null);
    try {
      if (inputMode === "file" && bulkFile) {
        const formData = new FormData();
        formData.append("file", bulkFile);
        const { data } = await api.post("/api/courses/import", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setBulkResult(data);
      } else {
        const validCourses = previewRows
          .filter((r) => r.status === "valid")
          .map((r) => ({
            courseCode: r.courseCode,
            courseName: r.courseName,
            creditHours: r.creditHours,
            department: r.department,
            semester: r.semester,
            shift: r.shift,
          }));

        const { data } = await api.post("/api/courses/import", { courses: validCourses });
        setBulkResult(data);
      }
      handleRefresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setBulkResult({
        imported: 0,
        skipped: [{ row: 0, reason: axiosErr?.response?.data?.error || "Import failed" }],
      });
    } finally {
      setImportingBulk(false);
    }
  };

  const resetBulkState = () => {
    setBulkDialogOpen(false);
    setBulkFile(null);
    setInputMode("file");
    setRawCsvText("");
    setPreviewRows([]);
    setBulkResult(null);
  };

  const handleRefresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<CourseWithDetails[]>(`/api/courses?programLevel=${programLevel}`),
      api.get<FacultyOption[]>(`/api/faculty?programLevel=${programLevel}`),
    ])
      .then(([c, f]) => {
        setCourses(Array.isArray(c.data) ? c.data : []);
        setFacultyList(Array.isArray(f.data) ? f.data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [programLevel]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const openAdd = () => {
    setEditingCourse(null);
    setForm({
      courseCode: "",
      courseName: "",
      creditHours: 3,
      totalMarks: 100,
      department: selectedDept || (programLevel === "INTERMEDIATE" ? "F.Sc Pre-Medical" : "Computer Science"),
      semester: selectedSem || 1,
      subjectSet: selectedSet || "Set 1",
    });
    setDialogOpen(true);
  };

  const openEdit = (c: CourseWithDetails) => {
    setEditingCourse(c);
    setForm({
      courseCode: formatCourseCode(c.courseCode, programLevel),
      courseName: c.courseName,
      creditHours: c.creditHours,
      totalMarks: c.totalMarks || 100,
      department: c.department || c.discipline || "Computer Science",
      semester: c.semester || c.part || 1,
      subjectSet: c.subjectSet || "Set 1",
    });
    setDialogOpen(true);
  };

  const openDetails = async (course: CourseWithDetails) => {
    setViewingCourse(course);
    setDetailDialogOpen(true);
    setLoadingAudit(true);
    try {
      const res = await api.get<AuditLogEntry[]>(
        `/api/audit-log?entity=Course&entityId=${course.id}`,
      );
      setCourseAuditLogs(res.data || []);
    } catch {
      setCourseAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleSave = async () => {
    if (!form.courseCode || !form.courseName || !form.department) return;
    setSaving(true);
    try {
      if (editingCourse) {
        const { data: updated } = await api.patch<CourseWithDetails>(
          `/api/courses/${editingCourse.id}`,
          {
            ...form,
            programLevel,
            ...(programLevel === "INTERMEDIATE"
              ? { discipline: form.department, part: form.semester, subjectSet: form.subjectSet, totalMarks: form.totalMarks }
              : { department: form.department, semester: form.semester, totalMarks: form.totalMarks }),
          },
        );
        setCourses((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
      } else {
        const { data: created } = await api.post<CourseWithDetails>(
          "/api/courses",
          {
            ...form,
            programLevel,
            ...(programLevel === "INTERMEDIATE"
              ? { discipline: form.department, part: form.semester, subjectSet: form.subjectSet, totalMarks: form.totalMarks }
              : { department: form.department, semester: form.semester, totalMarks: form.totalMarks }),
          },
        );
        setCourses((prev) => [created, ...prev]);
      }
      setDialogOpen(false);
      router.refresh();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCourse) return;
    setSaving(true);
    try {
      await api.delete(`/api/courses/${deletingCourse.id}`);
      setCourses((prev) => prev.filter((c) => c.id !== deletingCourse.id));
      setDeleteDialogOpen(false);
      setDeletingCourse(null);
      router.refresh();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const openAssignModal = (course: CourseWithDetails, shift: string = "Morning") => {
    setAssigningCourse(course);
    setSelectedAssignShift(shift);
    if (shift === "Morning") {
      setSelectedFaculty(
        course.assignedFacultyMorning ||
        (course.shift === "Morning" ? course.assignedFaculty || "" : "")
      );
    } else if (shift === "Evening") {
      setSelectedFaculty(
        course.assignedFacultyEvening ||
        (course.shift === "Evening" ? course.assignedFaculty || "" : "")
      );
    } else {
      setSelectedFaculty(course.assignedFaculty || "");
    }
    setAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!assigningCourse || !selectedFaculty) return;
    try {
      setAssigning(true);
      const payload: Record<string, string | null> = { shift: selectedAssignShift };

      if (selectedAssignShift === "Morning") {
        payload.assignedFacultyMorning = selectedFaculty;
        payload.assignedFaculty = selectedFaculty;
      } else if (selectedAssignShift === "Evening") {
        payload.assignedFacultyEvening = selectedFaculty;
        payload.assignedFaculty = selectedFaculty;
      } else {
        payload.assignedFacultyMorning = selectedFaculty;
        payload.assignedFacultyEvening = selectedFaculty;
        payload.assignedFaculty = selectedFaculty;
      }

      const { data: updated } = await api.patch<CourseWithDetails>(
        `/api/courses/${assigningCourse.id}`,
        payload,
      );
      setCourses((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      setAssignDialogOpen(false);
      setSelectedFaculty("");
      setSelectedAssignShift("Morning");
      router.refresh();
    } catch (err) {
      console.error("Failed to assign faculty:", err);
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (courseId?: string, targetShift?: string) => {
    const targetId = courseId || assigningCourse?.id;
    if (!targetId) return;
    const shiftToUnassign = targetShift || selectedAssignShift;
    const shiftKey = `${targetId}-${shiftToUnassign}`;

    try {
      setAssigning(true);
      setUnassigningShiftKey(shiftKey);
      const payload: Record<string, string | null> = { shift: shiftToUnassign };

      if (shiftToUnassign === "Morning") {
        payload.assignedFacultyMorning = null;
        payload.assignedFaculty = null;
      } else if (shiftToUnassign === "Evening") {
        payload.assignedFacultyEvening = null;
        payload.assignedFaculty = null;
      } else {
        payload.assignedFaculty = null;
        payload.assignedFacultyMorning = null;
        payload.assignedFacultyEvening = null;
      }

      const { data: updated } = await api.patch<CourseWithDetails>(
        `/api/courses/${targetId}`,
        payload,
      );
      setCourses((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      setAssignDialogOpen(false);
      setSelectedFaculty("");
      router.refresh();
    } catch (err) {
      console.error("Failed to unassign faculty:", err);
    } finally {
      setAssigning(false);
      setUnassigningShiftKey(null);
    }
  };

  const columns: Column<CourseWithDetails>[] = [
    {
      key: "courseCode",
      header: "Code",
      sortable: true,
      render: (row) => (
        <span className="font-mono font-semibold text-brand-primary">
          {formatCourseCode(row.courseCode, programLevel)}
        </span>
      ),
    },
    {
      key: "courseName",
      header: "Course Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{row.courseName}</span>
          {programLevel === "INTERMEDIATE" && row.subjectSet && (
            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-bold">
              {row.subjectSet}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "creditHours",
      header: programLevel === "INTERMEDIATE" ? "Total Marks" : "Credits",
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className="font-bold">
          {programLevel === "INTERMEDIATE"
            ? `${row.totalMarks || 100} Marks`
            : `${row.creditHours} CH`}
        </Badge>
      ),
    },
    {
      key: "morningFaculty" as keyof CourseWithDetails,
      header: "Morning Faculty",
      render: (row) => {
        const morningTeacher =
          row.facultyMorning?.user?.name ||
          (row.assignedFacultyMorning
            ? "Assigned"
            : row.assignedFaculty && (row.shift === "Morning" || row.shift === "Both")
              ? row.faculty?.user?.name
              : null);
        const morningDept =
          row.facultyMorning?.department ||
          (row.assignedFaculty && (row.shift === "Morning" || row.shift === "Both")
            ? row.faculty?.department
            : null);
        const isAssigned = Boolean(morningTeacher);
        const morningKey = `${row.id}-Morning`;
        const isUnassigningThis = unassigningShiftKey === morningKey;

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openAssignModal(row, "Morning");
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${isAssigned
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                  : "bg-muted text-muted-foreground border-dashed border-border hover:bg-accent"
                }`}
              title="Click to assign or change Morning Faculty"
            >
              <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>{isAssigned ? morningTeacher : "+ Assign Morning"}</span>
            </button>

            {isAssigned && (
              <button
                disabled={isUnassigningThis}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnassign(row.id, "Morning");
                }}
                className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                title="Unassign Morning Faculty"
              >
                {isUnassigningThis ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserMinus className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {morningDept && morningDept !== row.department && (
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md border border-purple-500/20">
                {morningDept}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "eveningFaculty" as keyof CourseWithDetails,
      header: "Evening Faculty",
      render: (row) => {
        const eveningTeacher =
          row.facultyEvening?.user?.name ||
          (row.assignedFacultyEvening
            ? "Assigned"
            : row.assignedFaculty && (row.shift === "Evening" || row.shift === "Both")
              ? row.faculty?.user?.name
              : null);
        const eveningDept =
          row.facultyEvening?.department ||
          (row.assignedFaculty && (row.shift === "Evening" || row.shift === "Both")
            ? row.faculty?.department
            : null);
        const isAssigned = Boolean(eveningTeacher);
        const eveningKey = `${row.id}-Evening`;
        const isUnassigningThis = unassigningShiftKey === eveningKey;

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openAssignModal(row, "Evening");
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${isAssigned
                  ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
                  : "bg-muted text-muted-foreground border-dashed border-border hover:bg-accent"
                }`}
              title="Click to assign or change Evening Faculty"
            >
              <Moon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>{isAssigned ? eveningTeacher : "+ Assign Evening"}</span>
            </button>

            {isAssigned && (
              <button
                disabled={isUnassigningThis}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnassign(row.id, "Evening");
                }}
                className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                title="Unassign Evening Faculty"
              >
                {isUnassigningThis ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserMinus className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {eveningDept && eveningDept !== row.department && (
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md border border-purple-500/20">
                {eveningDept}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "_count",
      header: "Enrolled",
      sortable: false,
      render: (row) => (
        <span className="font-medium">{row._count.enrollments}</span>
      ),
    },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openDetails(row)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4 text-brand-primary" />
          </button>
          <button
            onClick={() => openEdit(row)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
            title="Edit"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => {
              setDeletingCourse(row);
              setDeleteDialogOpen(true);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
      ),
    },
  ];

  // Filter courses for DataTable in View 3
  const filteredCourses = courses.filter((c) => {
    const matchesDept =
      !selectedDept ||
      selectedDept === "all" ||
      c.department.toLowerCase() === selectedDept.toLowerCase() ||
      (c.discipline && c.discipline.toLowerCase() === selectedDept.toLowerCase());
    const matchesSem =
      !selectedSem || Number(c.semester) === Number(selectedSem) || Number(c.part) === Number(selectedSem);
    
    if (programLevel === "INTERMEDIATE") {
      const setConfig = getSubjectSetFilterConfig(selectedDept || "");
      const activeSet = setConfig.hasMultipleSets ? (selectedSet || "Set 1") : "Set 1";
      const matchesSet = c.subjectSet ? c.subjectSet.toLowerCase() === activeSet.toLowerCase() : activeSet.toLowerCase() === "set 1";
      return matchesDept && matchesSem && matchesSet;
    }
    return matchesDept && matchesSem;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse border-2 border-border" />
            <div className="h-4 w-64 bg-muted animate-pulse border-2 border-border" />
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse border-2 border-border" />
        </div>
        <TableSkeleton rows={8} />
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
      <AnimatePresence mode="wait">
        {/* VIEW 1: DEPARTMENT SELECTOR */}
        {selectedDept === null && (
          <motion.div
            key="departments"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <PageHeader
              title="Manage Courses"
              subtitle="Select a department to manage semesters and subjects."
              breadcrumbs={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Manage Courses" },
              ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {getDisciplinesForLevel(programLevel).map((dept) => {
                const meta = departmentMeta[dept] || defaultMeta;
                const Icon = meta.icon;
                const deptCount = courses.filter((c) => c.department === dept).length;

                return (
                  <Card
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className="group border border-border bg-card hover:bg-accent/40 dark:hover:bg-accent/10 hover:border-brand-primary/20 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden rounded-xl"
                  >
                    <CardContent className="p-6 flex flex-col gap-4 relative">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${meta.bg} ${meta.border} ${meta.color} transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="h-6 w-6" />
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-bold text-base text-foreground group-hover:text-brand-primary transition-colors line-clamp-1">
                          {dept}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium">
                          {deptCount} Subject{deptCount !== 1 ? "s" : ""} Offered
                        </p>
                      </div>

                      <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                        <ChevronRight className="h-5 w-5 text-brand-primary" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* VIEW 2: SEMESTER SELECTOR */}
        {selectedDept !== null && selectedSem === null && (
          <motion.div
            key="semesters"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <PageHeader
              title={selectedDept}
              subtitle={programLevel === "INTERMEDIATE" ? "Select a part to manage its subjects." : "Select a semester to manage its subjects."}
              breadcrumbs={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Manage Courses", onClick: () => setSelectedDept(null), href: "#" },
                { label: selectedDept },
              ]}
              action={
                <Button
                  variant="outline"
                  onClick={() => setSelectedDept(null)}
                  className="gap-2 border-border hover:bg-accent hover:text-accent-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> {programLevel === "INTERMEDIATE" ? "Back to Disciplines" : "Back to Departments"}
                </Button>
              }
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {getTermOptionsForLevel(programLevel).map((sem) => {
                const semCount = courses.filter(
                  (c) => c.department === selectedDept && c.semester === sem
                ).length;

                return (
                  <Card
                    key={sem}
                    onClick={() => setSelectedSem(sem)}
                    className="group border border-border bg-card hover:bg-accent/40 dark:hover:bg-accent/10 hover:border-brand-primary/20 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden rounded-xl"
                  >
                    <CardContent className="p-5 flex flex-col gap-3 relative">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs font-semibold bg-brand-primary/5 text-brand-primary border-brand-primary/20">
                          {formatTermLabel(programLevel, sem)}
                        </Badge>
                        <GraduationCap className="h-5 w-5 text-muted-foreground/40 group-hover:text-brand-primary transition-colors" />
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-foreground group-hover:text-brand-primary transition-colors">
                          {formatTermLabel(programLevel, sem)} Subjects
                        </h4>
                        <p className="text-xs text-muted-foreground font-medium">
                          {semCount} Course{semCount !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                        <ChevronRight className="h-4 w-4 text-brand-primary" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* VIEW 3: COURSES LIST & TABLE */}
        {selectedDept !== null && selectedSem !== null && (
          <motion.div
            key="courses-table"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <PageHeader
              title="Manage Courses"
              subtitle={`${filteredCourses.length} subjects found`}
              breadcrumbs={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Manage Courses" },
              ]}
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 shadow-[2px_2px_0px_0px_var(--border)] cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--border)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_var(--border)] transition-all"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkDialogOpen(true)}
                    className="flex items-center gap-2 border border-border bg-card h-9 px-3.5 rounded-xl cursor-pointer hover:bg-accent hover:text-accent-foreground transition-all"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Bulk Upload
                  </Button>
                  {courses.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteAllDialogOpen(true)}
                      className="flex items-center gap-2 border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-card h-9 px-3.5 rounded-xl cursor-pointer hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete All
                    </Button>
                  )}
                  <Button
                    onClick={openAdd}
                    className="bg-brand-primary hover:bg-brand-primary/90 text-white h-9 px-4 rounded-xl flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add Subject
                  </Button>
                </div>
              }
            />

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border border-border w-full">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    {programLevel === "INTERMEDIATE" ? "Discipline:" : "Dept:"}
                  </Label>
                  <Select value={selectedDept || ""} onValueChange={setSelectedDept}>
                    <SelectTrigger className="w-[200px] h-10 bg-card rounded-xl">
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
                    value={String(selectedSem || 1)}
                    onValueChange={(v) => setSelectedSem(Number(v))}
                  >
                    <SelectTrigger className="w-[130px] h-10 bg-card rounded-xl">
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
              </div>
            </div>

            <DataTable
              data={filteredCourses as unknown as Record<string, unknown>[]}
              columns={columns as unknown as Column<Record<string, unknown>>[]}
              searchPlaceholder="Search by code, name, department, or instructor..."
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingCourse ? "Edit Subject" : "Add New Subject"}
            </DialogTitle>
            <DialogDescription>
              {editingCourse
                ? "Update subject details."
                : `Add a subject to ${formatTermLabel(programLevel, form.semester)} in ${form.department}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="courseCode">Subject Code</Label>
                <Input
                  id="courseCode"
                  value={form.courseCode}
                  onChange={(e) =>
                    setForm({ ...form, courseCode: e.target.value })
                  }
                  placeholder={programLevel === "INTERMEDIATE" ? "PHY-11" : "CS-301"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseName">Subject Name</Label>
                <Input
                  id="courseName"
                  value={form.courseName}
                  onChange={(e) =>
                    setForm({ ...form, courseName: e.target.value })
                  }
                  placeholder={programLevel === "INTERMEDIATE" ? "Physics" : "Database Systems"}
                />
              </div>
            </div>
            <div className={`grid ${programLevel === "INTERMEDIATE" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"} gap-4`}>
              {programLevel === "INTERMEDIATE" ? (
                <div className="space-y-2">
                  <Label htmlFor="totalMarks">Total Marks</Label>
                  <Input
                    id="totalMarks"
                    type="number"
                    value={form.totalMarks || 100}
                    onChange={(e) => setForm({ ...form, totalMarks: Number(e.target.value) })}
                    placeholder="100"
                    className="bg-card text-xs font-semibold"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="creditHours">Credit Hours</Label>
                  <Select
                    value={String(form.creditHours)}
                    onValueChange={(v) =>
                      setForm({ ...form, creditHours: Number(v) })
                    }
                  >
                    <SelectTrigger id="creditHours">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((c) => (
                        <SelectItem key={c} value={String(c)}>
                          {c} CH
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="dept">{programLevel === "INTERMEDIATE" ? "Discipline" : "Department"}</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) => setForm({ ...form, department: v })}
                >
                  <SelectTrigger id="dept">
                    <SelectValue placeholder={programLevel === "INTERMEDIATE" ? "Select discipline" : "Select department"} />
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
              <div className="space-y-2">
                <Label htmlFor="semester">{programLevel === "INTERMEDIATE" ? "Part" : "Semester"}</Label>
                <Select
                  value={String(form.semester)}
                  onValueChange={(v) =>
                    setForm({ ...form, semester: Number(v) })
                  }
                >
                  <SelectTrigger id="semester">
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
              {programLevel === "INTERMEDIATE" && (
                <div className="space-y-2">
                  <Label htmlFor="subjectSet">Subject Set</Label>
                  <Select
                    value={form.subjectSet || "Set 1"}
                    onValueChange={(v) => setForm({ ...form, subjectSet: v })}
                  >
                    <SelectTrigger id="subjectSet">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubjectSetsForDiscipline(form.department || selectedDept || "").map((set) => (
                        <SelectItem key={set} value={set}>
                          {set}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white min-w-[120px]"
            >
              {saving ? "Saving..." : editingCourse ? "Update" : "Add Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Faculty Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign Faculty</DialogTitle>
            <DialogDescription>
              Assign a faculty member and select a shift for{" "}
              <strong>{assigningCourse?.courseName}</strong> (
              {assigningCourse?.courseCode})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="faculty-select">Faculty Member</Label>
              <Select value={selectedFaculty} onValueChange={setSelectedFaculty} disabled={assigning}>
                <SelectTrigger id="faculty-select" className="bg-card">
                  <SelectValue placeholder="Select faculty member" />
                </SelectTrigger>
                <SelectContent>
                  {facultyList.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No faculty members available
                    </SelectItem>
                  ) : (
                    facultyList.map((f) => {
                      const isCrossDept = f.department !== assigningCourse?.department;
                      return (
                        <SelectItem key={f.id} value={f.id}>
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span className="font-medium">{f.user.name ?? "—"}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono ${isCrossDept
                                ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                                : "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                              }`}>
                              {f.department} {isCrossDept ? "(Cross-Dept)" : ""}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift-select">Assign Shift</Label>
              <Select value={selectedAssignShift} onValueChange={setSelectedAssignShift} disabled={assigning}>
                <SelectTrigger id="shift-select" className="bg-card">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning Shift</SelectItem>
                  <SelectItem value="Evening">Evening Shift</SelectItem>
                  <SelectItem value="Both">Both Shifts (Morning &amp; Evening)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
            {(selectedAssignShift === "Morning"
              ? Boolean(
                assigningCourse?.assignedFacultyMorning ||
                (assigningCourse?.assignedFaculty && assigningCourse.shift === "Morning")
              )
              : selectedAssignShift === "Evening"
                ? Boolean(
                  assigningCourse?.assignedFacultyEvening ||
                  (assigningCourse?.assignedFaculty && assigningCourse.shift === "Evening")
                )
                : Boolean(
                  assigningCourse?.assignedFaculty ||
                  assigningCourse?.assignedFacultyMorning ||
                  assigningCourse?.assignedFacultyEvening
                )) ? (
              <Button
                variant="destructive"
                onClick={() => handleUnassign(assigningCourse?.id, selectedAssignShift)}
                disabled={assigning}
                className="text-xs px-3 h-9 flex items-center gap-1.5 shrink-0"
                title="Unassign Faculty"
              >
                <UserMinus className="h-3.5 w-3.5" />
                Unassign
              </Button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
                disabled={assigning}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={assigning || !selectedFaculty || selectedFaculty === "none"}
                className="bg-brand-primary hover:bg-brand-primary/90 text-white min-w-20"
              >
                {assigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Subject</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingCourse?.courseName}</strong>? This will remove it from all student enrollments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={handleDelete} className="min-w-[100px]">
              {saving ? "Deleting..." : <><Trash2 className="h-4 w-4 mr-2" /> Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-3xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-brand-primary via-brand-secondary to-brand-primary" />
          <DialogHeader className="pt-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-brand-primary" />
              Course Details
            </DialogTitle>
            <DialogDescription>
              Detailed information and assignment logs for {viewingCourse?.courseName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Subject Code</span>
                <span className="font-mono font-bold text-sm text-foreground">{viewingCourse?.courseCode}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Subject Name</span>
                <span className="font-bold text-sm text-foreground">{viewingCourse?.courseName}</span>
              </div>
              <div className="mt-2">
                <span className="text-xs text-muted-foreground block font-medium">Department</span>
                <span className="font-semibold text-sm text-foreground">{viewingCourse?.department}</span>
              </div>
              <div className="mt-2">
                <span className="text-xs text-muted-foreground block font-medium">Semester / Credits</span>
                <span className="font-semibold text-sm text-foreground">Semester {viewingCourse?.semester} • {viewingCourse?.creditHours} CH</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Assigned Teacher</span>
                <span className="font-bold text-sm text-foreground font-semibold">
                  {viewingCourse?.faculty?.user?.name || "Unassigned"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Shift Assigned</span>
                <span className="font-bold text-sm text-foreground font-semibold">
                  {`${viewingCourse?.shift || "Morning"} Shift`}
                </span>
              </div>
            </div>

            {/* Audit Logs / Activity Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Activity History
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-2 rounded-2xl bg-muted/20 p-3 border border-border">
                {loadingAudit ? (
                  <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading audit logs...</span>
                  </div>
                ) : courseAuditLogs.length > 0 ? (
                  courseAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="text-xs flex flex-col gap-0.5 pb-2 border-b border-border/50 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-semibold text-foreground">{log.action}</span>
                        <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-muted-foreground">{log.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    No recent audit logs found.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setDetailDialogOpen(false)}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white min-w-20"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Courses Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={resetBulkState}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col overflow-hidden rounded-3xl border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              Bulk Upload Courses (CSV)
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file containing multiple courses across departments and semesters.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Step 1: Template and File Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/40 p-4 rounded-2xl border border-border">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">CSV Format Requirements</h4>
                <p className="text-xs text-muted-foreground">
                  Headers: <code className="font-mono text-brand-primary">courseCode, courseName, creditHours, department, semester, shift</code>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl"
              >
                <Download className="h-4 w-4" /> Download Sample CSV
              </Button>
            </div>

            {/* Input Mode Selector Tabs */}
            <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl w-fit text-xs font-semibold">
              <button
                type="button"
                onClick={() => setInputMode("file")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${inputMode === "file"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Upload className="h-3.5 w-3.5" /> Upload File
              </button>
              <button
                type="button"
                onClick={() => setInputMode("paste")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${inputMode === "paste"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Clipboard className="h-3.5 w-3.5" /> Paste Raw CSV Text
              </button>
            </div>

            {/* Mode 1: File Dropzone Input */}
            {inputMode === "file" && (
              <div className="relative border-2 border-dashed border-border hover:border-brand-primary/50 bg-card rounded-2xl p-6 text-center transition-all">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) parseAndPreviewCSV(f);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {bulkFile ? bulkFile.name : "Click or drag & drop CSV file to parse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {bulkFile ? `${(bulkFile.size / 1024).toFixed(1)} KB` : "CSV files up to 5MB supported"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Paste Raw CSV Input */}
            {inputMode === "paste" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Paste CSV contents (with headers):</span>
                  {rawCsvText && (
                    <button
                      type="button"
                      onClick={() => handleRawTextChange("")}
                      className="text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear Text
                    </button>
                  )}
                </div>
                <textarea
                  value={rawCsvText}
                  onChange={(e) => handleRawTextChange(e.target.value)}
                  placeholder={`courseCode,courseName,creditHours,department,semester,shift\nCS-301,Database Systems,3,Computer Science,3,Morning\nCS-302,Data Structures & Algorithms,4,Computer Science,3,Morning`}
                  rows={6}
                  className="w-full font-mono text-xs p-3 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-brand-primary/20 resize-y"
                />
              </div>
            )}

            {/* Results / Status Callout */}
            {bulkResult && (
              <div
                className={`p-4 rounded-2xl border ${bulkResult.imported > 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                  }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {bulkResult.imported > 0 ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  Successfully imported {bulkResult.imported} course(s)!
                </div>

                {bulkResult.skipped.length > 0 && (
                  <div className="mt-2 text-xs space-y-1">
                    <p className="font-semibold">Skipped Rows ({bulkResult.skipped.length}):</p>
                    <ul className="max-h-28 overflow-y-auto pl-4 list-disc space-y-0.5">
                      {bulkResult.skipped.map((s, idx) => (
                        <li key={idx}>
                          Row {s.row}: {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Live Preview Table */}
            {previewRows.length > 0 && !bulkResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
                  <span>Found {previewRows.length} rows in CSV</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      ● {previewRows.filter((r) => r.status === "valid").length} Valid
                    </span>
                    <span className="flex items-center gap-1 text-rose-500">
                      ● {previewRows.filter((r) => r.status !== "valid").length} Invalid / Skipped
                    </span>
                  </div>
                </div>

                <div className="border border-border rounded-xl max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b border-border sticky top-0">
                      <tr>
                        <th className="p-2.5 font-semibold">Row</th>
                        <th className="p-2.5 font-semibold">Code</th>
                        <th className="p-2.5 font-semibold">Subject Name</th>
                        <th className="p-2.5 font-semibold">Department</th>
                        <th className="p-2.5 font-semibold">Sem</th>
                        <th className="p-2.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewRows.map((r) => (
                        <tr key={r.rowNum} className={r.status !== "valid" ? "bg-rose-500/5" : ""}>
                          <td className="p-2.5 font-mono text-muted-foreground">{r.rowNum}</td>
                          <td className="p-2.5 font-mono font-semibold">{r.courseCode || "-"}</td>
                          <td className="p-2.5 font-medium">{r.courseName || "-"}</td>
                          <td className="p-2.5 text-muted-foreground">{r.department || "-"}</td>
                          <td className="p-2.5 font-medium">{r.semester || "-"}</td>
                          <td className="p-2.5">
                            {r.status === "valid" ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                Valid
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30">
                                {r.reason || "Invalid"}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-border">
            <Button variant="outline" disabled={importingBulk} onClick={resetBulkState}>
              {bulkResult ? "Done" : "Cancel"}
            </Button>
            {!bulkResult && (
              <Button
                onClick={handleConfirmImport}
                disabled={importingBulk || previewRows.filter((r) => r.status === "valid").length === 0}
                className="bg-brand-primary hover:bg-brand-primary/90 text-white min-w-[140px]"
              >
                {importingBulk ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...
                  </>
                ) : (
                  `Confirm & Import (${previewRows.filter((r) => r.status === "valid").length})`
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Courses Dialog */}
      <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-3xl border-rose-500/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-6 w-6" />
              Delete Courses in Bulk
            </DialogTitle>
            <DialogDescription className="pt-1 text-xs">
              Choose the deletion scope. This action will permanently remove courses and their enrollments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Options */}
            <div className="space-y-2 bg-rose-500/5 p-4 rounded-2xl border border-rose-500/20">
              <span className="font-semibold text-rose-700 dark:text-rose-300 block mb-2">Select Target Scope:</span>

              {/* Option 1: Specific Dept & Semester */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer hover:bg-accent/40 transition-colors">
                <input
                  type="radio"
                  name="purgeScope"
                  checked={purgeScope === "specific"}
                  onChange={() => setPurgeScope("specific")}
                  className="accent-rose-600 mt-1"
                />
                <div className="flex-1 space-y-2">
                  <span className="font-semibold text-foreground block">
                    Specific Department & Semester
                  </span>
                  {purgeScope === "specific" && (
                    <div className="grid grid-cols-2 gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <Label className="text-[10px] text-muted-foreground block mb-1">Department</Label>
                        <Select value={purgeDept} onValueChange={setPurgeDept}>
                          <SelectTrigger className="h-8 text-xs bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground block mb-1">Semester</Label>
                        <Select value={purgeSem} onValueChange={setPurgeSem}>
                          <SelectTrigger className="h-8 text-xs bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                              <SelectItem key={s} value={String(s)}>
                                Semester {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </label>

              {/* Option 2: Entire Department (All Semesters) */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer hover:bg-accent/40 transition-colors">
                <input
                  type="radio"
                  name="purgeScope"
                  checked={purgeScope === "department"}
                  onChange={() => setPurgeScope("department")}
                  className="accent-rose-600 mt-1"
                />
                <div className="flex-1 space-y-2">
                  <span className="font-semibold text-foreground block">
                    Entire Department (All 8 Semesters)
                  </span>
                  {purgeScope === "department" && (
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <Label className="text-[10px] text-muted-foreground block mb-1">Department</Label>
                      <Select value={purgeDept} onValueChange={setPurgeDept}>
                        <SelectTrigger className="h-8 text-xs bg-card w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </label>

              {/* Option 3: Entire College */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border cursor-pointer hover:bg-accent/40 transition-colors">
                <input
                  type="radio"
                  name="purgeScope"
                  checked={purgeScope === "entire"}
                  onChange={() => setPurgeScope("entire")}
                  className="accent-rose-600 mt-1"
                />
                <div>
                  <span className="font-semibold text-rose-600 dark:text-rose-400 block">
                    ALL Departments & ALL Semesters (Entire College)
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Deletes every single subject across all departments in the portal.
                  </span>
                </div>
              </label>
            </div>

            {/* Target Count Preview */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Selected Deletion Impact:</span>
              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 font-bold px-2.5 py-1">
                Will delete {targetCoursesCount} subject(s)
              </Badge>
            </div>

            {/* Confirmation Word Input for Entire Scope */}
            {purgeScope === "entire" && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Type &quot;DELETE&quot; to enable purging the entire college:
                </Label>
                <Input
                  value={purgeConfirmInput}
                  onChange={(e) => setPurgeConfirmInput(e.target.value)}
                  placeholder="DELETE"
                  className="h-9 font-mono text-xs uppercase bg-card border-rose-500/40"
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border">
            <Button variant="outline" disabled={deletingAll} onClick={() => setDeleteAllDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                deletingAll ||
                targetCoursesCount === 0 ||
                (purgeScope === "entire" && purgeConfirmInput.toUpperCase() !== "DELETE")
              }
              onClick={handleDeleteAllCourses}
              className="bg-rose-600 hover:bg-rose-700 text-white min-w-[140px]"
            >
              {deletingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Purging...
                </>
              ) : (
                `Purge ${targetCoursesCount} Course(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function parseCSVRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cells.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }

  cells.push(current);
  return cells;
}
