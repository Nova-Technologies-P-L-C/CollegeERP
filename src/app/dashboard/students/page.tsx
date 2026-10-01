"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/axios";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2, Eye, Calendar, Shield, RefreshCw, CheckCircle, BadgeCheck, Building2, BookOpen, GraduationCap, User, AlertOctagon, X, UserX } from "lucide-react";
import { AuditBadgeInline } from "@/components/dashboard/AuditBadge";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { useProgramLevel } from "@/context/program-level-context";
import {
  getDisciplinesForLevel,
  getTermOptionsForLevel,
  formatTermLabel,
  getSubjectSetFilterConfig,
} from "@/lib/constants";
import type { UserRole } from "@/types";
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
import { motion, AnimatePresence } from "framer-motion";
import { TableSkeleton, Spinner } from "@/components/ui";

interface StudentWithUser {
  id: string;
  userId: string;
  rollNo: string;
  phone: string | null;
  department: string;
  semester: number;
  enrollmentDate: string;
  avatar: string | null;
  shift: string;
  approvedBy?: string | null;
  blocked?: boolean;
  readmitRequested?: boolean;
  status?: string;
  subjectSet?: string | null;
  user: { name: string | null; email: string };
  _count: { enrollments: number };
}

const deptColors: Record<string, string> = {
  English: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Chemistry: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  Economics: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Political Science": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Zoology: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  Urdu: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "Islamic Studies":
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

interface EditForm {
  rollNo: string;
  phone: string;
  department: string;
  semester: number;
  shift: string;
}

const departmentIcons: Record<string, string> = {
  "Computer Science": "💻",
  Mathematics: "📐",
  Physics: "⚛️",
  English: "📚",
  Chemistry: "🧪",
  Economics: "📊",
  "Political Science": "🏛️",
  Zoology: "🦁",
  Urdu: "✍️",
  "Islamic Studies": "🕌",
};

const emptyForm: EditForm = {
  rollNo: "",
  phone: "",
  department: "",
  semester: 1,
  shift: "Morning",
};

export default function ManageStudentsPage() {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const { programLevel } = useProgramLevel();

  const role = useMemo<UserRole>(() => {
    const rawRole = user?.publicMetadata?.role;
    if (rawRole === "admin" || rawRole === "faculty" || rawRole === "student") {
      return rawRole;
    }
    return "student";
  }, [user?.publicMetadata?.role]);

  const isAdmin = role === "admin";
  const isFaculty = role === "faculty";

  interface CourseType {
    id: string;
    department: string;
    discipline?: string;
    part?: number;
    semester: number;
    courseCode: string;
    courseName: string;
  }
  const [courses, setCourses] = useState<CourseType[]>([]);

  const [students, setStudents] = useState<StudentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithUser | null>(
    null
  );
  const [deletingStudent, setDeletingStudent] =
    useState<StudentWithUser | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [selectedShift, setSelectedShift] = useState<string>("Morning");
  const [selectedSet, setSelectedSet] = useState<string>("Set 1");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setSelectedDept(programLevel === "INTERMEDIATE" ? "F.Sc Pre-Medical" : "Computer Science");
    setSelectedSemester(1);
  }, [programLevel]);

  // Detail Dialog states
  const [detailStudent, setDetailStudent] = useState<StudentWithUser | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Bulk/Class promotion & deletion states
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [targetSemester, setTargetSemester] = useState("1");
  const [isPromotingAllClass, setIsPromotingAllClass] = useState(false);
  const [gradesheetFile, setGradesheetFile] = useState<File | null>(null);
  const [gradesheetError, setGradesheetError] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<"selected" | "class" | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [readmittingStudentId, setReadmittingStudentId] = useState<string | null>(null);

  // Certification & Drop Off details states
  const [certTotalMarks, setCertTotalMarks] = useState<number>(1100);
  const [certObtainedMarks, setCertObtainedMarks] = useState<number>(950);
  const [certGrade, setCertGrade] = useState<string>("A+");
  const [dropOffReason, setDropOffReason] = useState<string>("Dropped out midway");
  const [part1MarksMap, setPart1MarksMap] = useState<Record<string, number>>({});

  // Mark Dropped dialog states
  const [markLeftDialogOpen, setMarkLeftDialogOpen] = useState(false);
  const [targetStudentForLeft, setTargetStudentForLeft] = useState<StudentWithUser | null>(null);
  const [leftReasonInput, setLeftReasonInput] = useState("Dropped out midway");
  const [markingLeft, setMarkingLeft] = useState(false);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), ok ? 3500 : 6000);
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteTarget) return;
    setBulkDeleting(true);
    try {
      const idsToDelete =
        bulkDeleteTarget === "selected"
          ? selectedStudentIds
          : filteredStudents.map((s) => s.id);

      if (idsToDelete.length > 0) {
        await Promise.all(idsToDelete.map((id) => api.delete(`/api/students/${id}`)));
        setStudents((prev) => prev.filter((s) => !idsToDelete.includes(s.id)));
        if (bulkDeleteTarget === "selected") {
          setSelectedStudentIds([]);
        }
        router.refresh();
      }
    } catch (err) {
      console.error("Bulk delete students failed:", err);
    } finally {
      setBulkDeleting(false);
      setBulkDeleteDialogOpen(false);
      setBulkDeleteTarget(null);
    }
  };

  const handleMarkLeft = async () => {
    if (!targetStudentForLeft) return;
    setMarkingLeft(true);
    try {
      await api.patch("/api/students/left", {
        studentId: targetStudentForLeft.id,
        action: "mark_left",
        reason: leftReasonInput || "Left studies midway",
      });
      setStudents((prev) => prev.filter((s) => s.id !== targetStudentForLeft.id));
      setMarkLeftDialogOpen(false);
      setTargetStudentForLeft(null);
      showToast(`Student ${targetStudentForLeft.rollNo} marked as Dropped`);
    } catch (err) {
      console.error("Failed to mark student as left:", err);
      showToast("Failed to update student status", false);
    } finally {
      setMarkingLeft(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!selectedDept || !selectedSemester) return [];
    return students.filter((s) => {
      const matchesDept = s.department === selectedDept;
      const matchesSem = s.semester === selectedSemester;
      const matchesShift = programLevel === "BS" ? s.shift === selectedShift : true;
      const notGraduated = s.status !== "Graduated" && s.status !== "HSSC Completed" && s.status !== "Left" && s.status !== "Dropped Out";

      if (programLevel === "INTERMEDIATE") {
        const setConfig = getSubjectSetFilterConfig(selectedDept || "");
        const activeSet = setConfig.hasMultipleSets ? (selectedSet || "Set 1") : "Set 1";
        const matchesSet = !s.subjectSet || s.subjectSet.toLowerCase() === activeSet.toLowerCase();
        return matchesDept && matchesSem && matchesSet && notGraduated;
      }

      return matchesDept && matchesSem && matchesShift && notGraduated;
    });
  }, [students, selectedDept, selectedSemester, selectedShift, selectedSet, programLevel]);

  const visibleDepartments = useMemo(() => {
    const list = getDisciplinesForLevel(programLevel);
    if (isAdmin) return list;
    if (isFaculty) {
      const facultyDepts = new Set(courses.map((c) => (c.discipline || c.department)));
      return list.filter((dept) => facultyDepts.has(dept));
    }
    return list.filter((dept) => students.some((s) => ((s as unknown as { discipline?: string }).discipline || s.department) === dept && s.status !== "Graduated" && s.status !== "HSSC Completed"));
  }, [isAdmin, isFaculty, courses, students, programLevel]);

  const visibleSemesters = useMemo(() => {
    const allSemesters = getTermOptionsForLevel(programLevel);
    if (isAdmin) return allSemesters;
    if (isFaculty) {
      const facultySemesters = new Set(
        courses
          .filter((c) => ((c as unknown as { discipline?: string }).discipline || c.department) === selectedDept)
          .map((c) => (c as unknown as { part?: number }).part || c.semester)
      );
      return allSemesters.filter((sem) => facultySemesters.has(sem));
    }
    return allSemesters.filter((sem) =>
      students.some((s) => ((s as unknown as { discipline?: string }).discipline || s.department) === selectedDept && ((s as unknown as { part?: number }).part || s.semester) === sem && s.status !== "Graduated" && s.status !== "HSSC Completed")
    );
  }, [isAdmin, isFaculty, courses, selectedDept, students, programLevel]);

  useEffect(() => {
    if (isLoaded && isAdmin) {
      if (!selectedDept) setSelectedDept(programLevel === "INTERMEDIATE" ? "F.Sc Pre-Medical" : "Computer Science");
      if (!selectedSemester) setSelectedSemester(1);
    }
  }, [isLoaded, isAdmin, selectedDept, selectedSemester, programLevel]);

  useEffect(() => {
    setSelectedStudentIds([]);
  }, [selectedDept, selectedSemester]);

  useEffect(() => {
    if (selectedSemester) {
      setTargetSemester(String(selectedSemester + 1));
    }
  }, [selectedSemester]);

  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedStudentIds.includes(s.id));
  }, [students, selectedStudentIds]);

  const canPromoteCount = useMemo(() => {
    if (isPromotingAllClass) {
      return filteredStudents.length;
    }
    return selectedStudents.length;
  }, [selectedStudents, filteredStudents, isPromotingAllClass]);

  const cannotPromoteCount = useMemo(() => {
    return 0;
  }, []);

  const handlePromote = async () => {
    setGradesheetError(null);

    if (Number(targetSemester) === 9) {
      if (!gradesheetFile) {
        setGradesheetError("Please select a mandatory PDF grade sheet file to convert student to Alumni status.");
        return;
      }
      if (!gradesheetFile.name.toLowerCase().endsWith(".pdf") && gradesheetFile.type !== "application/pdf") {
        setGradesheetError("Only PDF files (.pdf) are allowed for the degree grade sheet.");
        return;
      }
    }

    setPromoting(true);
    try {
      let payload: Record<string, unknown> = {
        targetSemester: Number(targetSemester),
      };

      if (Number(targetSemester) === 10) {
        payload.dropOffReason = dropOffReason || "Left studies midway";
      }

      if (Number(targetSemester) === 9) {
        if (gradesheetFile) {
          const base64Url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(gradesheetFile);
          });
          payload.gradesheetUrl = base64Url;
        }
        if (programLevel === "INTERMEDIATE") {
          payload.totalMarks = certTotalMarks;
          payload.obtainedMarks = certObtainedMarks;
          payload.percentage = certTotalMarks > 0 ? Number(((certObtainedMarks / certTotalMarks) * 100).toFixed(2)) : 0;
          payload.grade = certGrade;
        }
      }

      if (programLevel === "INTERMEDIATE" && Number(targetSemester) === 2) {
        payload.part1MarksMap = part1MarksMap;
      }

      if (isPromotingAllClass) {
        payload = {
          ...payload,
          department: selectedDept,
          semester: selectedSemester,
        };
      } else {
        const promoteIds = selectedStudents.map((s) => s.id);
        if (promoteIds.length === 0) return;
        payload = {
          ...payload,
          studentIds: promoteIds,
        };
      }

      const res = await api.post<{
        success: boolean;
        promotedCount: number;
        promotedStudents: { id: string; semester: number; status?: string }[];
        errors?: string[];
        error?: string;
      }>("/api/students/promote", payload);

      const data = res.data;

      if (data.errors && data.errors.length > 0) {
        if (data.promotedCount === 0) {
          setPromotionDialogOpen(false);
          setGradesheetFile(null);
          showToast(data.errors.join(" | "), false);
          return;
        } else {
          showToast(`Partial success (${data.promotedCount} promoted). Warnings: ${data.errors.join(" | ")}`, false);
        }
      } else {
        showToast(
          Number(targetSemester) === 10
            ? "Student(s) marked as Dropped"
            : Number(targetSemester) === 9
              ? (programLevel === "INTERMEDIATE" ? "Students successfully marked as HSSC Completed!" : "Students successfully graduated and converted to Alumni!")
              : "Students successfully promoted!"
        );
      }

      // Update local student semesters and status
      const promotedMap = new Map(data.promotedStudents.map((s) => [s.id, s]));
      setStudents((prev) =>
        prev.map((s) => {
          const updatedInfo = promotedMap.get(s.id);
          if (updatedInfo) {
            return {
              ...s,
              semester: updatedInfo.semester,
              status: updatedInfo.status ?? (Number(targetSemester) === 10 ? "Left" : Number(targetSemester) === 9 ? "Graduated" : s.status),
            };
          }
          return s;
        })
      );

      setSelectedStudentIds([]);
      setGradesheetFile(null);
      setPromotionDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      console.error("Promotion failed:", err);
      const apiErr = err as { response?: { data?: { error?: string; errors?: string[] } } };
      const errMsg =
        apiErr.response?.data?.error ||
        apiErr.response?.data?.errors?.join(" | ") ||
        "Failed to promote/graduate student. Please check clearance and retry.";
      
      // Auto-exit promotion dialog and gradesheet input so top red toast alert bar is fully visible
      setPromotionDialogOpen(false);
      setGradesheetFile(null);
      showToast(errMsg, false);
    } finally {
      setPromoting(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<unknown[]>(`/api/students?programLevel=${programLevel}`),
      api.get<CourseType[]>(`/api/courses?programLevel=${programLevel}`).catch(() => ({ data: [] }))
    ])
      .then(([studentsRes, coursesRes]) => {
        const d = studentsRes.data;
        const normalized = Array.isArray(d)
          ? d.map((item: unknown) => {
            const s = item as Record<string, unknown>;
            return {
              ...s,
              user: {
                name:
                  s.user && typeof s.user === "object" && "name" in s.user
                    ? s.user.name
                    : (s.name ?? null),
                email:
                  s.user && typeof s.user === "object" && "email" in s.user
                    ? s.user.email
                    : (s.email ?? ""),
              },
              _count: s._count ?? { enrollments: 0 },
            };
          })
          : [];
        setStudents(normalized as StudentWithUser[]);
        setCourses(coursesRes.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [programLevel]);

  useEffect(() => {
    if (!isLoaded) return;
    if (role === "student") {
      router.replace("/dashboard");
      return;
    }
    handleRefresh();
  }, [isLoaded, role, router, handleRefresh]);

  const openEdit = (s: StudentWithUser) => {
    setEditingStudent(s);
    setForm({
      rollNo: s.rollNo,
      phone: s.phone ?? "",
      department: s.department,
      semester: s.semester,
      shift: s.shift || "Morning",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingStudent || !form.rollNo || !form.department) return;
    setSubmitting(true);
    try {
      const { data: updated } = await api.patch<Record<string, unknown>>(
        `/api/students/${editingStudent.id}`,
        form
      );
      const normalized: StudentWithUser = {
        ...(updated as unknown as StudentWithUser),
        user: {
          name:
            ((updated.user as Record<string, unknown>)?.name as string) ??
            (updated.name as string) ??
            null,
          email:
            ((updated.user as Record<string, unknown>)?.email as string) ??
            (updated.email as string) ??
            "",
        },
        _count: (updated._count as { enrollments: number }) ?? {
          enrollments: 0,
        },
      };
      setStudents((prev) =>
        prev.map((s) => (s.id === normalized.id ? normalized : s))
      );
      setDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      console.error("Save failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;
    setDeleting(true);
    try {
      await api.delete(`/api/students/${deletingStudent.id}`);
      setStudents((prev) => prev.filter((s) => s.id !== deletingStudent.id));
      setDeleteDialogOpen(false);
      setDeletingStudent(null);
      router.refresh();
    } catch (err: unknown) {
      console.error("Delete failed:", err);
      setDeleteDialogOpen(false);
      setDeletingStudent(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<StudentWithUser>[] = [
    ...(isAdmin
      ? [
        {
          key: "selection",
          header: (
            <input
              type="checkbox"
              checked={
                filteredStudents.length > 0 &&
                filteredStudents.every((s) => selectedStudentIds.includes(s.id))
              }
              onChange={(e) => {
                const checked = e.target.checked;
                if (checked) {
                  const idsToAdd = filteredStudents.map((s) => s.id);
                  setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
                } else {
                  const idsToRemove = new Set(filteredStudents.map((s) => s.id));
                  setSelectedStudentIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
                }
              }}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#16122d] text-brand-primary focus:ring-brand-primary"
            />
          ),
          render: (row: StudentWithUser) => (
            <input
              type="checkbox"
              checked={selectedStudentIds.includes(row.id)}
              onChange={(e) => {
                const checked = e.target.checked;
                setSelectedStudentIds((prev) =>
                  checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                );
              }}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#16122d] text-brand-primary focus:ring-brand-primary"
            />
          ),
        },
      ]
      : []),
    {
      key: "user",
      header: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary shrink-0">
            {(row.user.name ?? "?")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">
                {row.user.name ?? "—"}
              </p>
              {row.readmitRequested && (
                <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold animate-pulse">
                  Re-Admission Requested
                </Badge>
              )}
              {row.blocked && !row.readmitRequested && (
                <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                  Struck Off
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    { key: "rollNo", header: "Roll No", sortable: true },
    {
      key: "department",
      header: programLevel === "INTERMEDIATE" ? "Discipline" : "Department",
      sortable: true,
      render: (row) => (
        <Badge variant="secondary" className={deptColors[row.department] || ""}>
          {row.department}
        </Badge>
      ),
    },
    {
      key: "semester",
      header: programLevel === "INTERMEDIATE" ? "Part" : "Semester",
      sortable: true,
      render: (row) => <span className="font-medium">{formatTermLabel(programLevel, row.semester)}</span>,
    },
    ...(programLevel === "BS"
      ? [
          {
            key: "shift" as keyof StudentWithUser,
            header: "Shift",
            sortable: true,
            render: (row: StudentWithUser) => (
              <Badge
                variant="outline"
                className={
                  row.shift === "Morning"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                }
              >
                {row.shift}
              </Badge>
            ),
          },
        ]
      : []),
    ...(isAdmin
      ? [
        {
          key: "actions" as keyof StudentWithUser,
          header: "Actions",
          render: (row: StudentWithUser) => (
            <div className="flex items-center gap-1">
              {row.blocked && (
                <Button
                  size="sm"
                  disabled={!row.readmitRequested || readmittingStudentId === row.id}
                  onClick={async () => {
                    if (!row.readmitRequested) return;
                    setReadmittingStudentId(row.id);
                    try {
                      await api.patch(`/api/students/${row.id}`, { blocked: false, readmitRequested: false });
                      setStudents((prev) =>
                        prev.map((s) => (s.id === row.id ? { ...s, blocked: false, readmitRequested: false } : s))
                      );
                      router.refresh();
                    } catch (err) {
                      console.error("Failed to approve re-admission:", err);
                    } finally {
                      setReadmittingStudentId(null);
                    }
                  }}
                  className={`h-8 text-xs rounded-lg px-2 gap-1 font-semibold ${row.readmitRequested
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed border border-muted"
                    }`}
                  title={
                    row.readmitRequested
                      ? "Approve Re-admission / Activate Student"
                      : "Re-admission request required from faculty first"
                  }
                >
                  {readmittingStudentId === row.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  Re-Admit Student
                </Button>
              )}
              <button
                onClick={() => {
                  setDetailStudent(row);
                  setDetailDialogOpen(true);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
                title="View Details"
              >
                <Eye className="h-4 w-4 text-muted-foreground" />
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
                  setTargetStudentForLeft(row);
                  setLeftReasonInput("Dropped out midway");
                  setMarkLeftDialogOpen(true);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-rose-500/10 transition-colors"
                title="Mark as Dropped"
              >
                <UserX className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </button>
              <button
                onClick={() => {
                  setDeletingStudent(row);
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
      ]
      : [
        {
          key: "actions" as keyof StudentWithUser,
          header: "Actions",
          render: (row: StudentWithUser) => (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setDetailStudent(row);
                  setDetailDialogOpen(true);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
                title="View Details"
              >
                <Eye className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ),
        },
      ]),
  ];

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0e0c18] flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-brand-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <AnimatePresence mode="wait">
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
              title="Manage Students"
              subtitle={`${students.filter((s) => s.status !== "Graduated").length} active students enrolled across all departments`}
              breadcrumbs={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Manage Students" },
              ]}
            />

            {loading ? (
              <TableSkeleton rows={10} />
            ) : (
              /* Department Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {visibleDepartments.map((dept) => {
                  const count = students.filter((s) => s.department === dept && s.status !== "Graduated").length;
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
              </div>
            )}
          </motion.div>
        )}

        {selectedDept !== null && selectedSemester === null && (
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
              subtitle={programLevel === "INTERMEDIATE" ? "Select a part to view the class list" : "Select a semester to view the class list"}
              breadcrumbs={[
                { label: "Dashboard", href: "/dashboard" },
                {
                  label: "Manage Students",
                  onClick: () => {
                    setSelectedDept(null);
                    setSelectedSemester(null);
                  },
                },
                { label: selectedDept },
              ]}
            />

            <div className="space-y-6">
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
                    (s) => s.department === selectedDept && s.semester === sem && s.status !== "Graduated"
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
            </div>
          </motion.div>
        )}

        {selectedDept !== null && selectedSemester !== null && (
          <motion.div
            key="students-table-view"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <PageHeader
              title={isAdmin ? "Manage Students" : `${selectedDept} - ${formatTermLabel(programLevel, selectedSemester)}`}
              subtitle={isAdmin ? `${filteredStudents.length} students found` : `${filteredStudents.length} students enrolled in this class`}
              breadcrumbs={
                isAdmin
                  ? [
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Manage Students" },
                  ]
                  : [
                    { label: "Dashboard", href: "/dashboard" },
                    {
                      label: "Manage Students",
                      onClick: () => {
                        setSelectedDept(null);
                        setSelectedSemester(null);
                      },
                    },
                    {
                      label: selectedDept!,
                      onClick: () => {
                        setSelectedSemester(null);
                      },
                    },
                    { label: formatTermLabel(programLevel, selectedSemester) },
                  ]
              }
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
                  {isAdmin && (
                    <>
                      <Button
                        onClick={() => {
                          if (selectedStudentIds.length === 0) {
                            showToast("Please select at least one student first to promote.", false);
                            return;
                          }
                          setIsPromotingAllClass(false);
                          setPromotionDialogOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-2 h-9 font-semibold shadow-sm"
                      >
                        Promote Selected {selectedStudentIds.length > 0 && `(${selectedStudentIds.length})`}
                      </Button>
                      <Button
                        onClick={() => {
                          if (selectedStudentIds.length === 0) {
                            showToast("Please select at least one student first to delete.", false);
                            return;
                          }
                          setBulkDeleteTarget("selected");
                          setBulkDeleteDialogOpen(true);
                        }}
                        variant="destructive"
                        className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-2 h-9 font-bold shadow-sm"
                      >
                        <Trash2 className="h-4 w-4" /> Delete Selected {selectedStudentIds.length > 0 && `(${selectedStudentIds.length})`}
                      </Button>
                    </>
                  )}
                </div>
              }
            />

            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 w-full">
                  {!isAdmin && (
                    <Button
                      variant="outline"
                      onClick={() => setSelectedSemester(null)}
                      className="rounded-xl border-2 shrink-0"
                    >
                      ← Back to Semesters
                    </Button>
                  )}

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
                  )}
                </div>
              </div>

              <div className="bg-card/50 backdrop-blur-sm border rounded-xl overflow-hidden shadow-sm">
                {loading ? (
                  <TableSkeleton rows={10} />
                ) : (
                  <DataTable
                    data={filteredStudents as unknown as Record<string, unknown>[]}
                    columns={columns as unknown as Column<Record<string, unknown>>[]}
                    searchPlaceholder="Search by name, roll no, department, email..."
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail View Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-[640px] p-0 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Student Profile Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected student profile.
            </DialogDescription>
          </DialogHeader>
          {detailStudent && (
            <div className="grid grid-cols-1 md:grid-cols-12 rounded-3xl overflow-hidden border border-border">
              {/* Left Column: Columnar Picture + Profile/Academic Details */}
              <div className="md:col-span-5 bg-gradient-to-br from-brand-primary to-brand-secondary p-6 text-center flex flex-col justify-between items-center text-white space-y-4">
                <div className="w-full flex items-center justify-between gap-2">
                  <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border backdrop-blur-sm ${detailStudent.blocked ? "bg-red-500/20 text-red-100 border-red-400/30" : "bg-white/20 text-white border-white/20"}`}>
                    {detailStudent.blocked ? "⛔ Suspended" : "✓ Active Student"}
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] text-white font-semibold">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified
                  </div>
                </div>

                <div className="flex flex-col items-center text-center w-full py-1">
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mx-auto flex items-center justify-center mb-2 border-2 border-white/30 overflow-hidden ring-4 ring-white/10 shadow-lg shrink-0">
                    {detailStudent.avatar ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={detailStudent.avatar} alt={detailStudent.user.name ?? "Avatar"} className="object-cover h-full w-full" />
                    ) : (
                      <User className="w-10 h-10 text-white/80" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{detailStudent.user.name ?? "Unnamed Student"}</h3>
                  <p className="text-xs text-white/80 font-mono mt-0.5">{detailStudent.rollNo}</p>
                </div>

                <div className="w-full space-y-2 pt-3 border-t border-white/20 text-left text-xs text-white/90">
                  <div>
                    <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">
                      {programLevel === "INTERMEDIATE" ? "Discipline" : "Department"}
                    </p>
                    <p className="font-semibold text-white truncate">{detailStudent.department}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">
                      {programLevel === "INTERMEDIATE" ? "Part" : "Semester & Shift"}
                    </p>
                    <p className="font-semibold text-white">
                      {programLevel === "INTERMEDIATE"
                        ? formatTermLabel("INTERMEDIATE", detailStudent.semester)
                        : `Semester ${detailStudent.semester} (${detailStudent.shift ?? "Morning"})`}
                    </p>
                  </div>
                  {detailStudent.phone && (
                    <div>
                      <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Phone</p>
                      <p className="font-semibold text-white">{detailStudent.phone}</p>
                    </div>
                  )}
                  {detailStudent.user.email && (
                    <div>
                      <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Email</p>
                      <p className="font-semibold text-white font-mono truncate">{detailStudent.user.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Dynamic & Institutional Details */}
              <div className="md:col-span-7 p-6 space-y-4 bg-card flex flex-col justify-between">
                <div className="space-y-3.5 text-sm">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Academic &amp; System Info</p>

                  {/* Institution */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-brand-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Institution</p>
                      <p className="font-semibold text-foreground">Nova Technology</p>
                    </div>
                  </div>

                  {/* Enrollment Date */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-brand-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Enrolled Since</p>
                      <p className="font-semibold text-foreground">
                        {detailStudent.enrollmentDate
                          ? new Date(detailStudent.enrollmentDate).toLocaleDateString("en-PK", {
                            year: "numeric", month: "long", day: "numeric",
                          })
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Approved By */}
                  {detailStudent.approvedBy && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-brand-primary" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Approved By</p>
                        <p className="font-semibold text-foreground">{detailStudent.approvedBy}</p>
                      </div>
                    </div>
                  )}

                  {/* System Audit */}
                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-brand-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">System Audit Details</p>
                      <div className="mt-0.5">
                        <AuditBadgeInline entity="Student" entityId={detailStudent.id} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Verified Student Record
                  </p>
                  <Button
                    onClick={() => setDetailDialogOpen(false)}
                    variant="outline"
                    className="rounded-xl h-8 px-4 text-xs font-medium"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <>
          {/* Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Student</DialogTitle>
                <DialogDescription>
                  Update the student information below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rollNo">Roll Number</Label>
                    <Input
                      id="rollNo"
                      value={form.rollNo}
                      onChange={(e) =>
                        setForm({ ...form, rollNo: e.target.value })
                      }
                      placeholder="CS-2022-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="0300-1234567"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{programLevel === "INTERMEDIATE" ? "Discipline" : "Department"}</Label>
                    <Select
                      value={form.department}
                      onValueChange={(v) => setForm({ ...form, department: v })}
                    >
                      <SelectTrigger>
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
                    <Label>{programLevel === "INTERMEDIATE" ? "Part" : "Semester"}</Label>
                    <Select
                      value={String(form.semester)}
                      onValueChange={(v) =>
                        setForm({ ...form, semester: Number(v) })
                      }
                    >
                      <SelectTrigger>
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
                </div>
                {programLevel === "BS" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Shift</Label>
                      <Select
                        value={form.shift}
                        onValueChange={(v) => setForm({ ...form, shift: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#110d22] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white">
                          <SelectItem value="Morning">Morning</SelectItem>
                          <SelectItem value="Evening">Evening</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" disabled={submitting} onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={submitting}
                  className="bg-brand-primary hover:bg-brand-primary/90 text-white min-w-[140px]"
                >
                  {submitting && <Spinner size="sm" variant="white" className="mr-2" />}
                  {submitting ? "Saving..." : "Update Student"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Delete Student</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete{" "}
                  <strong>{deletingStudent?.user.name}</strong> (
                  {deletingStudent?.rollNo})? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={deleting}
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" disabled={deleting} onClick={handleDelete} className="min-w-[100px]">
                  {deleting ? (
                    <Spinner size="sm" variant="white" className="mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Promotion Confirmation Dialog */}
          <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Promote Students</DialogTitle>
                <DialogDescription>
                  {isPromotingAllClass
                    ? `You are about to promote the entire class in ${selectedDept} ${formatTermLabel(programLevel, selectedSemester ?? 1)}.`
                    : "You are about to promote selected students."}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>{programLevel === "INTERMEDIATE" ? "Target Part / Status" : "Target Semester"}</Label>
                  <Select value={targetSemester} onValueChange={setTargetSemester}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select target semester" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#110d22] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white">
                      {(programLevel === "INTERMEDIATE" ? [1, 2, 9, 10] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((sem) => (
                        <SelectItem key={sem} value={String(sem)}>
                          {sem === 10
                            ? "❌ Drop Off / Dropped Student"
                            : sem === 9
                              ? (programLevel === "INTERMEDIATE" ? "🎓 HSSC Completed" : "🎓 Graduate to Alumni Status")
                              : formatTermLabel(programLevel, sem)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {programLevel === "INTERMEDIATE" && Number(targetSemester) === 2 && (
                  <div className="space-y-3 p-4 bg-brand-primary/10 border-2 border-brand-primary/30 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black uppercase text-brand-primary tracking-wider flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Part 1 Examination Obtained Marks (out of 550) *
                      </Label>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Please enter the Part 1 examination marks for each student before promoting to Part 2:
                    </p>
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1 pt-1">
                      {(isPromotingAllClass ? filteredStudents : selectedStudents).map((st) => (
                        <div key={st.id} className="flex items-center justify-between gap-3 bg-card p-2.5 rounded-xl border border-border">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">{st.user.name ?? "Student"}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{st.rollNo}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Input
                              type="number"
                              min={0}
                              max={550}
                              value={part1MarksMap[st.id] ?? 450}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setPart1MarksMap((prev) => ({ ...prev, [st.id]: val }));
                              }}
                              className="w-24 h-8 text-center text-xs font-bold bg-background"
                            />
                            <span className="text-xs text-muted-foreground font-bold">/ 550</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Number(targetSemester) === 10 && (
                  <div className="space-y-2 p-4 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl">
                    <Label className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <UserX className="h-4 w-4" />
                      Reason for Drop Off / Leaving *
                    </Label>
                    <Input
                      type="text"
                      value={dropOffReason}
                      onChange={(e) => setDropOffReason(e.target.value)}
                      placeholder="e.g., Financial hardship, Transferred, Personal reason"
                      className="bg-card text-xs font-semibold"
                    />
                    <p className="text-xs text-muted-foreground">
                      Selected student(s) will be marked as <strong>Dropped</strong> and transferred to the <strong>Dropped Students</strong> directory.
                    </p>
                  </div>
                )}

                {Number(targetSemester) === 9 && (
                  <div className="space-y-4">
                    <div className="space-y-2 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl">
                      <Label className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Mandatory Complete Grade Sheet / Certificate (PDF File Only) *
                      </Label>
                      <Input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file && !file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
                            setGradesheetError("Only PDF files (.pdf) are allowed");
                            setGradesheetFile(null);
                          } else {
                            setGradesheetError(null);
                            setGradesheetFile(file);
                          }
                        }}
                        className="bg-card border-border text-xs cursor-pointer file:cursor-pointer file:hover:cursor-pointer hover:cursor-pointer file:bg-brand-primary file:text-white file:border-0 file:rounded-lg file:px-3 file:py-1 transition-all"
                      />
                      {gradesheetError && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">{gradesheetError}</p>
                      )}
                      {gradesheetFile && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          ✓ Selected: {gradesheetFile.name} ({(gradesheetFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>

                    {programLevel === "INTERMEDIATE" && (
                      <div className="p-4 bg-card border-2 border-brand-primary/30 rounded-2xl space-y-3">
                        <h4 className="text-xs font-black uppercase text-brand-primary tracking-wider">HSSC Board Examination Results</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-bold">Total Marks *</Label>
                            <Input
                              type="number"
                              value={certTotalMarks}
                              onChange={(e) => setCertTotalMarks(Number(e.target.value))}
                              placeholder="1100"
                              className="bg-card h-9 text-xs font-semibold"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-bold">Obtained Marks *</Label>
                            <Input
                              type="number"
                              value={certObtainedMarks}
                              onChange={(e) => setCertObtainedMarks(Number(e.target.value))}
                              placeholder="950"
                              className="bg-card h-9 text-xs font-semibold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-bold">Board Grade *</Label>
                            <Select value={certGrade} onValueChange={setCertGrade}>
                              <SelectTrigger className="h-9 bg-card text-xs font-semibold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["A+", "A", "B", "C", "D", "E"].map((g) => (
                                  <SelectItem key={g} value={g}>{g} Grade</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-muted-foreground">Percentage (%)</Label>
                            <div className="h-9 px-3 bg-muted rounded-xl text-xs font-extrabold flex items-center text-emerald-600 dark:text-emerald-400 border">
                              {certTotalMarks > 0 ? ((certObtainedMarks / certTotalMarks) * 100).toFixed(2) : 0}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This action will:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground pl-2">
                    <li>
                      {Number(targetSemester) === 9
                        ? (programLevel === "INTERMEDIATE"
                            ? "Mark student status as HSSC Completed"
                            : "Change student status to Graduated (Alumni Directory)")
                        : `Update their semesters to Semester ${targetSemester}`}
                    </li>
                    <li>
                      {Number(targetSemester) === 9
                        ? "Archive active course enrollments while preserving past academic records"
                        : "Automatically enroll them in all courses offered in the target semester"}
                    </li>
                  </ul>
                </div>



                <div className="p-3 bg-accent/30 rounded-xl space-y-2 border">
                  <div className="flex justify-between text-sm">
                    <span>Target Students Count:</span>
                    <span className="font-semibold">{isPromotingAllClass ? filteredStudents.length : selectedStudentIds.length}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Eligible for Promotion:</span>
                    <span className="font-semibold">{canPromoteCount}</span>
                  </div>
                  {cannotPromoteCount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Already in Target / Final Sem (Skipped):</span>
                      <span className="font-semibold">{cannotPromoteCount}</span>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={promoting}
                  onClick={() => setPromotionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePromote}
                  disabled={promoting || canPromoteCount === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                >
                  {promoting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {promoting ? "Promoting..." : `Promote (${canPromoteCount})`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bulk Delete Confirmation Dialog */}
          <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[450px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-600 font-bold">
                  <Trash2 className="h-5 w-5" />
                  Confirm Bulk Student Deletion
                </DialogTitle>
                <DialogDescription>
                  {bulkDeleteTarget === "selected"
                    ? `Are you sure you want to permanently delete ${selectedStudentIds.length} selected student(s)? This action cannot be undone.`
                    : `Are you sure you want to permanently delete all ${filteredStudents.length} student(s) in ${selectedDept} Semester ${selectedSemester} (${selectedShift} Shift)? This action cannot be undone.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 pt-3">
                <Button variant="outline" disabled={bulkDeleting} onClick={() => setBulkDeleteDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={bulkDeleting}
                  onClick={handleBulkDelete}
                  className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 gap-2"
                >
                  {bulkDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {bulkDeleting ? "Deleting..." : "Confirm Delete Students"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Mark Student as Left/Dropped Out Dialog */}
          <Dialog open={markLeftDialogOpen} onOpenChange={setMarkLeftDialogOpen}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle className="text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <UserX className="h-5 w-5" /> Mark Student as Dropped
                </DialogTitle>
                <DialogDescription>
                  Mark <strong>{targetStudentForLeft?.user.name}</strong> ({targetStudentForLeft?.rollNo}) as dropped from their academic journey.
                </DialogDescription>
              </DialogHeader>

              <div className="py-3 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="leftReason" className="text-xs font-bold">Reason for Drop *</Label>
                  <Input
                    id="leftReason"
                    value={leftReasonInput}
                    onChange={(e) => setLeftReasonInput(e.target.value)}
                    placeholder="e.g., Financial hardship, Transferred, Personal reason"
                    className="bg-card text-xs"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This student will be moved to the <strong>Dropped Students</strong> directory. Administrators can readmit them at any time.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" disabled={markingLeft} onClick={() => setMarkLeftDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleMarkLeft}
                  disabled={markingLeft || !leftReasonInput.trim()}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  {markingLeft ? "Updating..." : "Mark as Left"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Top of Screen Alert Toast Bar */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: "-50%", scale: 0.96 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: -30, x: "-50%", scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`fixed top-6 left-1/2 z-[9999] w-[92%] max-w-lg rounded-2xl p-4 shadow-lg backdrop-blur-md border-2 flex items-start gap-3.5 ${
              toast.ok
                ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500/30 text-emerald-900 dark:text-emerald-100 shadow-emerald-500/10"
                : "bg-rose-50 dark:bg-rose-950/80 border-rose-500/30 text-rose-900 dark:text-rose-100 shadow-rose-500/10"
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${toast.ok ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
              {toast.ok ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertOctagon className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0 pr-1 space-y-0.5">
              <h4 className={`text-sm font-bold tracking-tight ${toast.ok ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"}`}>
                {toast.ok ? "Action Successful" : "Graduation Clearance Blocked"}
              </h4>
              <p className="text-xs font-semibold leading-relaxed text-foreground/80 whitespace-pre-line">
                {toast.msg.replace(/^Clearance Error:\s*/i, "")}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 shrink-0 cursor-pointer"
              title="Dismiss Alert"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
