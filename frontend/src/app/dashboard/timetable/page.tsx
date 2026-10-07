"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import {
  Clock,
  MapPin,
  Download,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  AlertTriangle,
  UserCheck,
  Loader2,
  Palette,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { AuditBadgeInline } from "@/components/dashboard/AuditBadge";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  DEPARTMENTS,
  INTERMEDIATE_DISCIPLINES,
  getDisciplinesForLevel,
  getTermOptionsForLevel,
  formatTermLabel,
} from "@/lib/constants";
import { TIMETABLE_DAYS } from "@/lib/timetable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui";
import type {
  TimetableApiEntry,
  TimetableDay,
  TimetableMutationInput,
} from "@/types";

interface CourseOption {
  id: string;
  courseCode: string;
  courseName: string;
  creditHours?: number;
  department: string;
  semester: number;
  facultyName: string | null;
  facultyMorningName?: string | null;
  facultyEveningName?: string | null;
}

interface FacultyOption {
  id: string;
  name: string;
  department: string;
}

interface TimetableApiError {
  error?: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const EMPTY_FORM: TimetableMutationInput = {
  courseId: "",
  room: "",
  day: "Monday",
  startTime: "07:45",
  endTime: "08:30",
  shift: "Morning",
};

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

function to12HourTime(time: string): string {
  const [hourPart, minutePart] = time.split(":");
  const hours = Number(hourPart);
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalized = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(normalized).padStart(2, "0")}:${minutePart} ${suffix}`;
}

function add45Minutes(time: string, durationMinutes = 45): string {
  const [hours, minutes] = time.split(":").map(Number);
  let nextMinutes = minutes + durationMinutes;
  let nextHours = hours;
  if (nextMinutes >= 60) {
    nextHours = (nextHours + Math.floor(nextMinutes / 60)) % 24;
    nextMinutes = nextMinutes % 60;
  }
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

function getTeacherForCourseAndShift(course: CourseOption, shift: string): string {
  if (shift === "Morning") {
    return course.facultyMorningName || course.facultyName || "Unassigned";
  }
  if (shift === "Evening") {
    return course.facultyEveningName || course.facultyName || "Unassigned";
  }
  return course.facultyName || course.facultyMorningName || course.facultyEveningName || "Unassigned";
}

import { useProgramLevel } from "@/context/program-level-context";

export default function TimetablePage() {
  const router = useRouter();
  const { programLevel } = useProgramLevel();
  const [timetable, setTimetable] = useState<TimetableApiEntry[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState<string>("Computer Science");
  const [filterSemester, setFilterSemester] = useState<string>("1");
  const [filterShift, setFilterShift] = useState<string>("Morning");

  useEffect(() => {
    const validTerms = getTermOptionsForLevel(programLevel).map(String);
    if (!validTerms.includes(filterSemester)) {
      setFilterSemester(validTerms[0] || "1");
    }

    if (programLevel === "INTERMEDIATE") {
      if (!(INTERMEDIATE_DISCIPLINES as readonly string[]).includes(filterDept)) {
        setFilterDept("ICS");
      }
      setFilterShift("Morning");
    } else {
      if (!(DEPARTMENTS as readonly string[]).includes(filterDept)) {
        setFilterDept("Computer Science");
      }
    }
  }, [programLevel, filterDept, filterSemester]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableApiEntry | null>(
    null,
  );
  const [form, setForm] = useState<TimetableMutationInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<TimetableApiEntry | "bulk" | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<"color" | "bw">("color");

  useEffect(() => {
    if (mutationError) {
      const timer = setTimeout(() => setMutationError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [mutationError]);

  // Dynamic grid configuration states
  const [gridStart, setGridStart] = useState("07:45");
  const [gridDuration, setGridDuration] = useState(45);
  const [gridSlotsCount, setGridSlotsCount] = useState(7);
  const [deletingTimetableId, setDeletingTimetableId] = useState<string | null>(null);
  const [selectedTimetableIds, setSelectedTimetableIds] = useState<string[]>([]);

  const handleToggleSelectSlot = (id: string) => {
    setSelectedTimetableIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteSlots = async () => {
    if (selectedTimetableIds.length === 0) return;
    setDeletingTimetableId("bulk");
    try {
      await Promise.all(selectedTimetableIds.map((id) => api.delete(`/api/timetable/${id}`)));
      setTimetable((prev) => prev.filter((t) => !selectedTimetableIds.includes(t.id)));
      setSelectedTimetableIds([]);
    } catch (err) {
      console.error("Bulk delete failed:", err);
    } finally {
      setDeletingTimetableId(null);
    }
  };

  const slots = useMemo(() => {
    const list = [];
    if (!gridStart || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(gridStart)) {
      return [];
    }
    let [h, m] = gridStart.split(":").map(Number);
    for (let i = 0; i < gridSlotsCount; i++) {
      const startStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      m += gridDuration;
      if (m >= 60) {
        h += Math.floor(m / 60);
        m = m % 60;
        h = h % 24;
      }
      const endStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      list.push({ start: startStr, end: endStr });
    }
    return list;
  }, [gridStart, gridDuration, gridSlotsCount]);

  const sequentialLecturesByDay = useMemo(() => {
    const map: Record<string, TimetableApiEntry[]> = {};
    DAYS.forEach((d) => {
      map[d] = [];
    });

    timetable.forEach((item) => {
      if (map[item.day]) {
        map[item.day].push(item);
      }
    });

    DAYS.forEach((d) => {
      map[d].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );
    });

    let maxLectures = 0;
    DAYS.forEach((d) => {
      if (map[d].length > maxLectures) {
        maxLectures = map[d].length;
      }
    });

    if (maxLectures === 0) {
      maxLectures = 1;
    }

    const rows = Array.from({ length: maxLectures }, (_, i) => i);
    return { map, maxLectures, rows };
  }, [timetable]);

  const loadSettings = useCallback((shift: string) => {
    api
      .get(`/api/timetable/settings?shift=${shift}`)
      .then((res) => {
        if (res.data) {
          setGridStart(res.data.startTime);
          setGridDuration(res.data.duration);
          setGridSlotsCount(res.data.slots);
        }
      })
      .catch((err) => console.error("Error loading timetable settings:", err));
  }, []);

  useEffect(() => {
    loadSettings(filterShift);
  }, [filterShift, loadSettings]);


  const loadTimetable = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("department", filterDept);
    params.set("semester", filterSemester);
    params.set("shift", filterShift);

    api
      .get<TimetableApiEntry[]>(`/api/timetable?${params.toString()}`)
      .then((r) => setTimetable(Array.isArray(r.data) ? r.data : []))
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { data?: TimetableApiError } };
        setTimetable([]);
        setError(axiosErr.response?.data?.error ?? "Failed to load timetable");
      })
      .finally(() => setLoading(false));
  }, [filterDept, filterSemester, filterShift]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  useEffect(() => {
    setCoursesLoading(true);
    api
      .get<unknown>("/api/courses")
      .then((r) => {
        const payload = r.data;
        if (!Array.isArray(payload)) {
          setCourses([]);
          return;
        }

        const mappedCourses = payload
          .map((item) => {
            if (!item || typeof item !== "object") return null;

            const row = item as Record<string, unknown>;
            const id = String(row.id ?? "").trim();
            const courseCode = String(row.courseCode ?? "").trim();
            const courseName = String(row.courseName ?? "").trim();
            const creditHours = Number(row.creditHours ?? 3);
            const department = String(row.department ?? "").trim();
            const semester = Number(row.semester ?? 0);
            const facObj = row.faculty && typeof row.faculty === "object" ? (row.faculty as { user?: { name?: string } }) : null;
            const facM = row.facultyMorning && typeof row.facultyMorning === "object" ? (row.facultyMorning as { user?: { name?: string } }) : null;
            const facE = row.facultyEvening && typeof row.facultyEvening === "object" ? (row.facultyEvening as { user?: { name?: string } }) : null;

            const facultyName =
              typeof row.facultyName === "string" ? row.facultyName : facObj?.user?.name ?? null;
            const facultyMorningName = facM?.user?.name ?? null;
            const facultyEveningName = facE?.user?.name ?? null;

            if (
              !id ||
              !courseCode ||
              !courseName ||
              !department ||
              !Number.isInteger(semester)
            ) {
              return null;
            }

            return {
              id,
              courseCode,
              courseName,
              creditHours,
              department,
              semester,
              facultyName,
              facultyMorningName,
              facultyEveningName,
            } as CourseOption;
          })
          .filter((course): course is CourseOption => Boolean(course));

        setCourses(mappedCourses);
      })
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));

    api
      .get("/api/faculty")
      .then((r) => {
        if (Array.isArray(r.data)) {
          setFacultyList(
            r.data.map((f: { id: string; user?: { name?: string; email?: string }; department: string }) => ({
              id: f.id,
              name: f.user?.name ?? f.user?.email ?? "Faculty Member",
              department: f.department,
            }))
          );
        }
      })
      .catch(() => setFacultyList([]));
  }, []);

  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [selectedTeacherToAssign, setSelectedTeacherToAssign] = useState<string>("");
  const [assigningTeacher, setAssigningTeacher] = useState<boolean>(false);

  // Batch Dialog states
  const [batchDialogOpen, setBatchDialogOpen] = useState<boolean>(false);
  const [batchDurationPreset, setBatchDurationPreset] = useState<"45" | "30" | "custom">("45");
  const [batchCustomDuration, setBatchCustomDuration] = useState<number>(60);
  const [batchEntries, setBatchEntries] = useState<{
    id: string;
    courseId: string;
    day: string;
    startTime: string;
    endTime: string;
    room: string;
    enabled: boolean;
  }[]>([]);
  const [batchSaving, setBatchSaving] = useState<boolean>(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Auto Generator Dialog states
  const [autoGenDialogOpen, setAutoGenDialogOpen] = useState<boolean>(false);
  const [autoGenRoomsInput, setAutoGenRoomsInput] = useState<string>("Room 101, Room 102, Room 103");
  const [autoGenDays, setAutoGenDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [courseSlotTargets, setCourseSlotTargets] = useState<Record<string, number>>({});
  const [autoGenOverwrite, setAutoGenOverwrite] = useState<boolean>(true);
  const [autoGenGenerating, setAutoGenGenerating] = useState<boolean>(false);
  const [autoGenError, setAutoGenError] = useState<string | null>(null);

  useEffect(() => {
    // Moved below primaryCourses definition
  }, []);

  const handleAutoGenerateTimetable = async () => {
    if (autoGenDays.length === 0) {
      const errMsg = "Please select at least one active day to generate the timetable.";
      setAutoGenError(errMsg);
      setMutationError(errMsg);
      setAutoGenDialogOpen(false);
      return;
    }
    setAutoGenGenerating(true);
    setAutoGenError(null);
    try {
      const roomList = autoGenRoomsInput.split(",").map((r) => r.trim()).filter(Boolean);
      await api.post("/api/timetable/auto-generate", {
        programLevel,
        ...(programLevel === "INTERMEDIATE"
          ? {
              discipline: filterDept,
              part: Number(filterSemester),
            }
          : {
              department: filterDept,
              semester: Number(filterSemester),
              shift: filterShift,
            }),
        rooms: roomList.length > 0 ? roomList : ["Room 101", "Room 102"],
        startTime: gridStart,
        duration: Number(gridDuration),
        slotsCount: Number(gridSlotsCount),
        days: autoGenDays,
        courseSlotTargets,
        overwriteExisting: autoGenOverwrite,
      });
      setAutoGenDialogOpen(false);
      await loadTimetable();
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const errMsg = axiosErr.response?.data?.error ?? "Failed to auto-generate timetable";
      setAutoGenError(errMsg);
      setMutationError(errMsg);
      setAutoGenDialogOpen(false);
    } finally {
      setAutoGenGenerating(false);
    }
  };

  const recalculateBatchSchedule = (
    preset: "45" | "30" | "custom",
    customMins?: number
  ) => {
    const duration =
      preset === "45" ? 45 : preset === "30" ? 30 : customMins ?? batchCustomDuration;

    setBatchEntries((prev) => {
      if (prev.length === 0) return prev;
      const baseStartMins = timeToMinutes(prev[0]?.startTime || gridStart || "08:00");
      return prev.map((entry, idx) => {
        const startM = baseStartMins + idx * duration;
        const endM = startM + duration;
        const startH = Math.floor(startM / 60) % 24;
        const startMinsRem = startM % 60;
        const endH = Math.floor(endM / 60) % 24;
        const endMinsRem = endM % 60;

        const startStr = `${String(startH).padStart(2, "0")}:${String(startMinsRem).padStart(2, "0")}`;
        const endStr = `${String(endH).padStart(2, "0")}:${String(endMinsRem).padStart(2, "0")}`;

        return {
          ...entry,
          startTime: startStr,
          endTime: endStr,
        };
      });
    });
  };

  const handleAssignTeacher = async (courseId: string, facultyId: string, shift: string = "Morning") => {
    if (!courseId || !facultyId) return;
    setAssigningTeacher(true);
    setMutationError(null);
    try {
      const payload: Record<string, string> = { shift };
      if (shift === "Morning") {
        payload.assignedFacultyMorning = facultyId;
        payload.assignedFaculty = facultyId;
      } else if (shift === "Evening") {
        payload.assignedFacultyEvening = facultyId;
        payload.assignedFaculty = facultyId;
      } else {
        payload.assignedFaculty = facultyId;
      }

      await api.patch(`/api/courses/${courseId}`, payload);
      const fac = facultyList.find((f) => f.id === facultyId);
      setCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          if (shift === "Morning") {
            return { ...c, facultyMorningName: fac?.name ?? "Assigned", facultyName: fac?.name ?? "Assigned" };
          } else if (shift === "Evening") {
            return { ...c, facultyEveningName: fac?.name ?? "Assigned", facultyName: fac?.name ?? "Assigned" };
          }
          return { ...c, facultyName: fac?.name ?? "Assigned" };
        })
      );
    } catch {
      setMutationError("Failed to assign teacher to course");
    } finally {
      setAssigningTeacher(false);
    }
  };

  const openBatchDialog = () => {
    const semester = Number(filterSemester);
    const semesterCourses = courses.filter(
      (c) => c.department.trim().toLowerCase() === filterDept.trim().toLowerCase() && c.semester === semester
    );
    const targetCourses = semesterCourses.length > 0 ? semesterCourses : courses;

    if (targetCourses.length === 0) {
      setMutationError(`No courses available in database`);
      return;
    }

    const defaultEntries = targetCourses.map((c, idx) => {
      const startMins = timeToMinutes(gridStart) + idx * gridDuration;
      const startH = Math.floor(startMins / 60) % 24;
      const startM = startMins % 60;
      const startStr = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
      const endStr = add45Minutes(startStr, gridDuration);

      return {
        id: `batch-${c.id}-${idx}-${Date.now()}`,
        courseId: c.id,
        day: "Monday",
        startTime: startStr,
        endTime: endStr,
        room: `Room ${101 + idx}`,
        enabled: true,
      };
    });

    setBatchEntries(defaultEntries);
    setBatchError(null);
    setBatchDialogOpen(true);
  };

  const handleSyncBatchDay = (newDay: string) => {
    setBatchEntries((prev) =>
      prev.map((e) => ({ ...e, day: newDay }))
    );
  };

  const handleAddBatchEntry = () => {
    const defaultCourseId = primaryCourses[0]?.id ?? courses[0]?.id ?? "";
    const currentBatchDay = batchEntries[0]?.day ?? "Monday";
    const idx = batchEntries.length;
    const startMins = timeToMinutes(gridStart) + idx * gridDuration;
    const startH = Math.floor(startMins / 60) % 24;
    const startM = startMins % 60;
    const startStr = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
    const endStr = add45Minutes(startStr, gridDuration);

    setBatchEntries((prev) => [
      ...prev,
      {
        id: `custom-batch-${Date.now()}-${Math.random()}`,
        courseId: defaultCourseId,
        day: currentBatchDay,
        startTime: startStr,
        endTime: endStr,
        room: `Room ${101 + idx}`,
        enabled: true,
      },
    ]);
  };

  const handleRemoveBatchEntry = (idToRemove: string) => {
    setBatchEntries((prev) => prev.filter((e) => e.id !== idToRemove));
  };

  const handleToggleBatchEntryEnabled = (idToToggle: string) => {
    setBatchEntries((prev) =>
      prev.map((e) => (e.id === idToToggle ? { ...e, enabled: !e.enabled } : e))
    );
  };

  const handleBatchSubmit = async () => {
    const activeEntries = batchEntries.filter((e) => e.enabled && e.courseId);
    if (activeEntries.length === 0) {
      const errMsg = "No active entries selected. Please enable at least one lecture to create.";
      setBatchError(errMsg);
      setMutationError(errMsg);
      setBatchDialogOpen(false);
      return;
    }

    setBatchSaving(true);
    setBatchError(null);
    try {
      await api.post("/api/timetable/batch", {
        department: filterDept,
        semester: Number(filterSemester),
        shift: filterShift,
        entries: activeEntries.map(({ courseId, day, startTime, endTime, room }) => ({
          courseId,
          day,
          startTime,
          endTime,
          room,
        })),
      });
      setBatchDialogOpen(false);
      await loadTimetable();
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const errMsg = axiosErr.response?.data?.error ?? "Failed to create batch schedule";
      setBatchError(errMsg);
      setMutationError(errMsg);
      setBatchDialogOpen(false);
    } finally {
      setBatchSaving(false);
    }
  };

  const primaryCourses = useMemo(() => {
    const semester = Number(filterSemester);
    const targetDept = filterDept.trim().toLowerCase();
    return courses.filter(
      (course) =>
        course.department.trim().toLowerCase() === targetDept &&
        course.semester === semester,
    );
  }, [courses, filterDept, filterSemester]);

  useEffect(() => {
    if (!form.courseId && primaryCourses.length > 0 && !editingEntry) {
      setForm((current) => ({ ...current, courseId: primaryCourses[0].id }));
    }
  }, [editingEntry, primaryCourses, form.courseId]);

  useEffect(() => {
    if (primaryCourses.length > 0) {
      setCourseSlotTargets((prev) => {
        const updated = { ...prev };
        primaryCourses.forEach((c) => {
          if (updated[c.id] === undefined) {
            updated[c.id] = c.creditHours || 3;
          }
        });
        return updated;
      });
    }
  }, [primaryCourses]);

  const openCreateDialog = (day?: TimetableDay, startTime?: string, endTime?: string) => {
    const defaultStart = gridStart;
    const defaultEnd = add45Minutes(gridStart, gridDuration);
    const selectedStart = startTime ?? defaultStart;
    const selectedEnd = endTime ?? (startTime ? add45Minutes(startTime, gridDuration) : defaultEnd);
    const defaultCourseId = primaryCourses[0]?.id ?? courses[0]?.id ?? "";

    setEditingEntry(null);
    setMutationError(null);
    setForm({
      ...EMPTY_FORM,
      day: day ?? "Monday",
      startTime: selectedStart,
      endTime: selectedEnd,
      courseId: defaultCourseId,
      shift: filterShift,
    });
    setDialogOpen(true);
  };


  const openEditDialog = (entry: TimetableApiEntry) => {
    setEditingEntry(entry);
    setMutationError(null);
    setForm({
      courseId: entry.courseId,
      room: entry.room,
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
      shift: entry.shift,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setMutationError(null);

    try {
      if (editingEntry) {
        await api.patch(`/api/timetable/${editingEntry.id}`, form);
      } else {
        await api.post("/api/timetable", form);
      }
      setDialogOpen(false);
      await loadTimetable();
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: TimetableApiError } };
      setMutationError(
        axiosErr.response?.data?.error ?? "Failed to save timetable entry",
      );
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: TimetableApiEntry) => {
    setDeletingTimetableId(entry.id);
    setMutationError(null);
    try {
      await api.delete(`/api/timetable/${entry.id}`);
      await loadTimetable();
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: TimetableApiError } };
      setMutationError(
        axiosErr.response?.data?.error ?? "Failed to delete timetable entry",
      );
    } finally {
      setDeletingTimetableId(null);
    }
  };

  const handleExportPdf = () => {
    setMutationError(null);
    setPdfModalOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Floating Top Warning/Error Toast */}
      {mutationError && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl bg-rose-600 text-white shadow-2xl border border-rose-400 font-bold text-sm max-w-[90vw] text-center"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{mutationError}</span>
        </motion.div>
      )}

      <PageHeader
        title="Manage Timetable"
        subtitle="Create, edit, and export class schedules"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Timetable" },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {selectedTimetableIds.length > 0 && (
              <>
                <Button
                  variant="destructive"
                  className="h-9 gap-2 font-bold"
                  onClick={() => setConfirmDeleteTarget("bulk")}
                  disabled={deletingTimetableId === "bulk"}
                >
                  {deletingTimetableId === "bulk" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete Selected ({selectedTimetableIds.length})
                </Button>
                <Button
                  variant="outline"
                  className="h-9 font-semibold text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedTimetableIds([])}
                >
                  Cancel Selection
                </Button>
              </>
            )}
            <Button
              variant="outline"
              className="h-9 gap-2"
              onClick={handleExportPdf}
            >
              <Download className="h-4 w-4" /> View / Export PDF
            </Button>
            <Button
              onClick={() => setAutoGenDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 shadow-lg shadow-emerald-600/20 gap-1.5 font-bold"
            >
              <Sparkles className="h-4 w-4" /> Auto Generator
            </Button>
            <Button
              onClick={() => openBatchDialog()}
              className="bg-purple-600 hover:bg-purple-700 text-white h-9 shadow-lg shadow-purple-600/20 gap-1.5"
            >
              <Sparkles className="h-4 w-4" /> Batch Generator
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 mb-8">
        <div className="flex flex-wrap items-center gap-4 p-4 bg-card border rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {programLevel === "INTERMEDIATE" ? "Discipline:" : "Department:"}
            </span>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-50 bg-transparent border-none focus:ring-0 font-semibold text-brand-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getDisciplinesForLevel(programLevel).map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-6 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {programLevel === "INTERMEDIATE" ? "Part:" : "Semester:"}
            </span>
            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger className="w-36 bg-transparent border-none focus:ring-0 font-semibold text-brand-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getTermOptionsForLevel(programLevel).map((semester) => (
                  <SelectItem key={semester} value={String(semester)}>
                    {formatTermLabel(programLevel, semester)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {programLevel === "BS" && (
            <>
              <div className="h-6 w-px bg-border hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Shift:
                </span>
                <Select value={filterShift} onValueChange={setFilterShift}>
                  <SelectTrigger className="w-32 bg-transparent border-none focus:ring-0 font-semibold text-brand-primary">
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

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading || coursesLoading ? (
          <TableSkeleton rows={6} />
        ) : (
          <div className="overflow-x-auto rounded-3xl border bg-card shadow-xl p-6">
            <table className="w-full border-separate border-spacing-2">
              <thead>
                <tr>
                  <th className="p-3 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center bg-muted/30 rounded-xl w-24">
                    Lecture
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className="p-3 text-sm font-bold uppercase tracking-widest text-muted-foreground text-center bg-muted/30 rounded-xl min-w-[95px]"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sequentialLecturesByDay.rows.map((lectureIdx) => (
                  <tr key={`lecture-${lectureIdx}`}>
                    <td className="p-4 text-xs font-bold text-muted-foreground text-center bg-muted/10 rounded-xl whitespace-nowrap">
                      Lecture {lectureIdx + 1}
                    </td>
                    {DAYS.map((day) => {
                      const cls = sequentialLecturesByDay.map[day]?.[lectureIdx];
                      if (cls) {
                        const isSelected = selectedTimetableIds.includes(cls.id);
                        return (
                          <td key={`${day}-${cls.id}`} className="p-0 align-top">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              onClick={() => handleToggleSelectSlot(cls.id)}
                              className={`group p-3.5 border-l-4 rounded-xl m-1 transition-all duration-300 shadow-xs hover:shadow-md h-full min-h-25 cursor-pointer select-none ${isSelected
                                  ? "bg-brand-primary/15 border-l-brand-primary ring-2 ring-brand-primary/50 shadow-md"
                                  : "bg-brand-primary/5 border-l-brand-primary hover:bg-brand-primary/10"
                                }`}
                            >
                              <div className="space-y-1.5">
                                {/* 1. Day Badge & Actions */}
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                                    {day}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] h-4 bg-white/50 backdrop-blur-sm px-1 py-0 border-brand-primary/20"
                                    >
                                      <MapPin className="h-2 w-2 mr-1" />{" "}
                                      {cls.room}
                                    </Badge>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={() => handleToggleSelectSlot(cls.id)}
                                      className="h-3.5 w-3.5 rounded accent-brand-primary cursor-pointer"
                                      title="Select slot for bulk deletion"
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditDialog(cls);
                                      }}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-brand-primary/20"
                                      title="Edit entry"
                                    >
                                      <Pencil className="h-3 w-3 text-brand-primary" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteTarget(cls);
                                      }}
                                      disabled={deletingTimetableId === cls.id}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-rose-100 disabled:opacity-50"
                                      title="Delete entry"
                                    >
                                      {deletingTimetableId === cls.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin text-rose-600" />
                                      ) : (
                                        <Trash2 className="h-3 w-3 text-rose-600" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* 2. Subject */}
                                <div className="pt-0.5">
                                  <span className="text-[10px] font-bold text-brand-primary uppercase tracking-tighter block break-words">
                                    {cls.course.courseCode}
                                  </span>
                                  <h4 className="text-xs font-bold text-foreground leading-tight break-words">
                                    {cls.course.courseName}
                                  </h4>
                                </div>

                                {/* 3. Teacher (plain text name, no icon) */}
                                <div className="text-[11px] font-semibold text-foreground/90">
                                  {cls.shift === "Morning"
                                    ? cls.course.facultyMorning?.user?.name || cls.course.faculty?.user?.name || "Unassigned"
                                    : cls.shift === "Evening"
                                      ? cls.course.facultyEvening?.user?.name || cls.course.faculty?.user?.name || "Unassigned"
                                      : cls.course.faculty?.user?.name || cls.course.facultyMorning?.user?.name || cls.course.facultyEvening?.user?.name || "Unassigned"}
                                </div>

                                {/* 4. Time */}
                                <div className="text-[10px] font-mono text-muted-foreground pt-0.5">
                                  {to12HourTime(cls.startTime)} - {to12HourTime(cls.endTime)}
                                </div>
                                <AuditBadgeInline
                                  entity="Timetable"
                                  entityId={cls.id}
                                />
                              </div>
                            </motion.div>
                          </td>
                        );
                      }

                      const fallbackSlot = slots[lectureIdx] || {
                        start: "08:00",
                        end: "08:45",
                      };

                      return (
                        <td key={`${day}-empty-${lectureIdx}`} className="p-0 align-top">
                          <div className="h-full min-h-25 m-1 rounded-xl bg-accent/20 border border-dotted border-muted-foreground/10 flex items-center justify-center group">
                            <button
                              onClick={() =>
                                openCreateDialog(
                                  day as TimetableDay,
                                  fallbackSlot.start,
                                  fallbackSlot.end
                                )
                              }
                              className="text-[10px] font-medium text-muted-foreground/60 hover:text-brand-primary transition-colors py-2 px-3"
                            >
                              + Add Lecture
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-130">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit timetable entry" : "Add timetable entry"}
            </DialogTitle>
            <DialogDescription>
              Assign a course, room, and time slot. Conflict checks run
              automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Course</Label>
              <Select
                value={form.courseId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, courseId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {primaryCourses.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No courses available for {filterDept} Sem {filterSemester}
                    </SelectItem>
                  ) : (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-brand-primary uppercase tracking-wider px-2 py-1 bg-brand-primary/5 rounded-md mb-1">
                        {filterDept} — Semester {filterSemester}
                      </SelectLabel>
                      {primaryCourses.map((c) => {
                        const teacher = getTeacherForCourseAndShift(c, form.shift);
                        const hasNoTeacher = !teacher || teacher === "Unassigned";
                        return (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center justify-between gap-2 w-full text-xs">
                              <span className="font-bold">{c.courseCode} — {c.courseName}</span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded font-mono ${hasNoTeacher ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                                {hasNoTeacher ? "⚠️ Unassigned" : teacher}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>

              {/* Unassigned Teacher Guard Banner */}
              {(() => {
                const selectedCourse = courses.find((c) => c.id === form.courseId);
                if (!selectedCourse) return null;
                const teacherName = getTeacherForCourseAndShift(selectedCourse, form.shift);
                const isUnassigned = !teacherName || teacherName === "Unassigned";
                if (!isUnassigned) return null;

                return (
                  <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Subject Unassigned: No teacher assigned to {selectedCourse.courseCode} ({form.shift} Shift)
                    </div>
                    <p className="text-muted-foreground">
                      Assign a teacher below before finalizing this timetable entry:
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Select
                        value={selectedTeacherToAssign}
                        onValueChange={setSelectedTeacherToAssign}
                      >
                        <SelectTrigger className="h-9 bg-card text-xs rounded-lg">
                          <SelectValue placeholder="Select Faculty Member..." />
                        </SelectTrigger>
                        <SelectContent>
                          {facultyList.map((fac) => (
                            <SelectItem key={fac.id} value={fac.id}>
                              {fac.name} ({fac.department})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={!selectedTeacherToAssign || assigningTeacher}
                        onClick={() => handleAssignTeacher(selectedCourse.id, selectedTeacherToAssign, form.shift)}
                        className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1 rounded-lg shrink-0"
                      >
                        {assigningTeacher ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                        Assign {form.shift} Teacher
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="grid gap-2">
              <Label>Room</Label>
              <Input
                value={form.room}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    room: event.target.value,
                  }))
                }
                placeholder="Room 201"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Day</Label>
                <Select
                  value={form.day}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      day: value as TimetableDay,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMETABLE_DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Shift</Label>
                <Select
                  value={form.shift}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      shift: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Start</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startTime: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>End</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      endTime: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || (() => {
                const c = courses.find((x) => x.id === form.courseId);
                return !c?.facultyName || c.facultyName === "Unassigned";
              })()}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white"
            >
              {saving
                ? "Saving..."
                : editingEntry
                  ? "Update Entry"
                  : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Schedule Generator Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-[900px] lg:max-w-[1100px] xl:max-w-[1200px] w-[95vw] max-h-[90vh] overflow-y-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              Batch Schedule Generator — {filterDept} (Sem {filterSemester})
            </DialogTitle>
            <DialogDescription>
              Generate or update class timetable entries for all courses in this semester in a single action.
            </DialogDescription>
          </DialogHeader>

          {batchError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400 font-medium">
              {batchError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl flex items-center justify-between flex-wrap gap-2">
              <span>Target Shift: <strong className="text-foreground">{filterShift}</strong></span>

              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">Batch Day:</span>
                <Select
                  value={batchEntries[0]?.day ?? "Monday"}
                  onValueChange={handleSyncBatchDay}
                >
                  <SelectTrigger className="h-7 text-xs font-bold w-[125px] rounded-lg bg-background border border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMETABLE_DAYS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <span>Total Entries: <strong className="text-foreground">{batchEntries.length}</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active: {batchEntries.filter(e => e.enabled).length}</span>
            </div>

            {/* Lecture Duration Radio Group Selection */}
            <div className="p-3.5 bg-card rounded-2xl border border-border space-y-2 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-brand-primary" />
                  Lecture Length (All Slots):
                </span>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="batchDuration"
                      value="45"
                      checked={batchDurationPreset === "45"}
                      onChange={() => {
                        setBatchDurationPreset("45");
                        recalculateBatchSchedule("45");
                      }}
                      className="h-3.5 w-3.5 accent-brand-primary cursor-pointer"
                    />
                    <span>45 mins</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="batchDuration"
                      value="30"
                      checked={batchDurationPreset === "30"}
                      onChange={() => {
                        setBatchDurationPreset("30");
                        recalculateBatchSchedule("30");
                      }}
                      className="h-3.5 w-3.5 accent-brand-primary cursor-pointer"
                    />
                    <span>30 mins</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="batchDuration"
                      value="custom"
                      checked={batchDurationPreset === "custom"}
                      onChange={() => {
                        setBatchDurationPreset("custom");
                        recalculateBatchSchedule("custom", batchCustomDuration);
                      }}
                      className="h-3.5 w-3.5 accent-brand-primary cursor-pointer"
                    />
                    <span>Custom</span>
                  </label>
                </div>
              </div>

              {batchDurationPreset === "custom" && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground font-medium">Custom Duration:</span>
                  <Input
                    type="number"
                    min="5"
                    max="180"
                    value={batchCustomDuration}
                    onChange={(e) => {
                      const val = Math.max(5, Math.min(180, Number(e.target.value) || 30));
                      setBatchCustomDuration(val);
                      recalculateBatchSchedule("custom", val);
                    }}
                    className="w-20 h-7 text-xs font-mono rounded-lg"
                  />
                  <span className="text-xs text-muted-foreground font-medium">minutes per lecture</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {batchEntries.map((entry, idx) => {
                const course = courses.find((c) => c.id === entry.courseId);
                const teacherName = course ? getTeacherForCourseAndShift(course, filterShift) : null;
                const isUnassigned = !teacherName || teacherName === "Unassigned";

                return (
                  <div
                    key={entry.id || `batch-${idx}`}
                    className={`p-4 border rounded-2xl shadow-xs transition-all ${entry.enabled
                        ? "bg-card border-border"
                        : "bg-muted/30 border-dashed border-border/60 opacity-60"
                      }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Include checkbox & Course Select & Teacher info */}
                      <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[280px]">
                        <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                          <input
                            type="checkbox"
                            checked={entry.enabled}
                            onChange={() => handleToggleBatchEntryEnabled(entry.id)}
                            className="h-4 w-4 rounded accent-brand-primary cursor-pointer"
                          />
                          <span className={`text-xs font-bold ${entry.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                            {entry.enabled ? "Include" : "Skipped"}
                          </span>
                        </label>

                        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                          <Select
                            value={entry.courseId}
                            onValueChange={(val) => {
                              setBatchEntries((prev) =>
                                prev.map((item) => (item.id === entry.id ? { ...item, courseId: val } : item))
                              );
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs font-bold border rounded-lg bg-background px-2.5 flex-1 min-w-[160px]">
                              <SelectValue placeholder="Select Course..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-80">
                              {primaryCourses.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.courseCode} - {c.courseName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {isUnassigned ? (
                            <Badge variant="destructive" className="text-[10px] py-0 px-2 uppercase font-bold shrink-0">
                              Unassigned Teacher
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono text-emerald-600 border-emerald-500/30 shrink-0">
                              {teacherName}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Right: Controls Grid & Delete Button */}
                      <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 min-w-[320px]">
                          <div>
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Day</Label>
                            <Select
                              value={entry.day}
                              onValueChange={(val) => handleSyncBatchDay(val)}
                            >
                              <SelectTrigger className="h-8 text-xs rounded-lg font-bold bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIMETABLE_DAYS.map((d) => (
                                  <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Start Time</Label>
                            <Input
                              type="time"
                              value={entry.startTime}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchEntries((prev) =>
                                  prev.map((item) =>
                                    item.id === entry.id
                                      ? { ...item, startTime: val, endTime: add45Minutes(val, gridDuration) }
                                      : item
                                  )
                                );
                              }}
                              className="h-8 text-xs rounded-lg font-mono bg-background"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">End Time</Label>
                            <Input
                              type="time"
                              value={entry.endTime}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchEntries((prev) =>
                                  prev.map((item) => (item.id === entry.id ? { ...item, endTime: val } : item))
                                );
                              }}
                              className="h-8 text-xs rounded-lg font-mono bg-background"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Room</Label>
                            <Input
                              value={entry.room}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchEntries((prev) =>
                                  prev.map((item) => (item.id === entry.id ? { ...item, room: val } : item))
                                );
                              }}
                              className="h-8 text-xs rounded-lg bg-background"
                              placeholder="Room 101"
                            />
                          </div>
                        </div>

                        {isUnassigned && (
                          <div className="flex items-center gap-1">
                            <Select
                              value={selectedTeacherToAssign}
                              onValueChange={setSelectedTeacherToAssign}
                            >
                              <SelectTrigger className="h-8 text-[11px] w-[130px] rounded-lg">
                                <SelectValue placeholder="Assign teacher..." />
                              </SelectTrigger>
                              <SelectContent>
                                {facultyList.map((f) => (
                                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              disabled={!selectedTeacherToAssign || assigningTeacher}
                              onClick={() => handleAssignTeacher(entry.courseId, selectedTeacherToAssign, filterShift)}
                              className="h-8 text-[11px] px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shrink-0"
                            >
                              Assign
                            </Button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveBatchEntry(entry.id)}
                          className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 transition-colors shrink-0"
                          title="Remove entry from batch"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddBatchEntry}
              className="w-full h-10 border-dashed border-2 border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 rounded-2xl gap-2 font-bold text-xs"
            >
              <Plus className="h-4 w-4" />
              Add Custom Lecture Entry
            </Button>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleBatchSubmit}
              disabled={batchSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2 shadow-lg shadow-purple-600/20"
            >
              {batchSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {batchSaving ? "Generating Schedule..." : "Create All Timetable Slots"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDeleteTarget} onOpenChange={(open) => { if (!open) setConfirmDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 font-bold">
              <AlertTriangle className="h-5 w-5" />
              Confirm Timetable Deletion
            </DialogTitle>
            <DialogDescription>
              {confirmDeleteTarget === "bulk"
                ? `Are you sure you want to delete ${selectedTimetableIds.length} selected timetable slots? This operation cannot be undone.`
                : `Are you sure you want to delete the timetable slot for "${(confirmDeleteTarget as TimetableApiEntry)?.course?.courseName}" on ${(confirmDeleteTarget as TimetableApiEntry)?.day}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmDeleteTarget(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDeleteTarget === "bulk") {
                  handleBulkDeleteSlots();
                } else if (confirmDeleteTarget) {
                  handleDelete(confirmDeleteTarget);
                }
                setConfirmDeleteTarget(null);
              }}
              className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* In-App PDF Preview Dialog */}
      <Dialog open={pdfModalOpen} onOpenChange={setPdfModalOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-3xl p-6">
          <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Download className="h-5 w-5 text-brand-primary" />
                Timetable PDF Schedule Preview
              </DialogTitle>
              <DialogDescription>
                {filterDept} — Semester {filterSemester} ({filterShift} Shift)
              </DialogDescription>

              {/* Format Selector Toggle: Color vs Black & White */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-bold text-muted-foreground">Print Format:</span>
                <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setExportMode("color")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${exportMode === "color"
                        ? "bg-brand-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <Palette className="h-3.5 w-3.5" /> Color
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportMode("bw")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${exportMode === "bw"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <FileText className="h-3.5 w-3.5" /> Black & White
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  const printContent = document.getElementById("printable-timetable-area");
                  if (!printContent) return;
                  const win = window.open("", "", "width=1200,height=900");
                  if (!win) return;
                  win.document.write(`<!doctype html><html><head><title>Timetable - ${filterDept} Sem ${filterSemester}</title><style>*{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; } body{ font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #111827; } table{ width: 100%; border-collapse: collapse; margin-top: 12px; } th, td{ border: 1px solid ${exportMode === "bw" ? "#000000" : "#cbd5e1"}; padding: 8px 10px; font-size: 11px; vertical-align: top; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } th{ background-color: ${exportMode === "bw" ? "#e2e8f0" : "#f1f5f9"}; color: #000000; } @media print{ *{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }</style></head><body>${printContent.innerHTML}</body></html>`);
                  win.document.close();
                  win.focus();
                  win.print();
                }}
                className="bg-brand-primary text-white h-9 rounded-xl gap-2 text-xs font-bold shadow-md hover:bg-brand-primary/95"
              >
                <Download className="h-4 w-4" /> Download / Print PDF
              </Button>
              <Button variant="outline" onClick={() => setPdfModalOpen(false)} className="h-9 rounded-xl text-xs">
                Close
              </Button>
            </div>
          </DialogHeader>

          <div
            id="printable-timetable-area"
            className={`p-5 rounded-2xl border transition-all space-y-4 ${exportMode === "bw"
                ? "bg-white text-black border-zinc-400"
                : "bg-white dark:bg-zinc-900 text-foreground border-border"
              }`}
          >
            <div className="border-b pb-3 flex justify-between items-end">
              <div>
                <h2 className={`text-lg font-bold ${exportMode === "bw" ? "text-black" : "text-brand-primary"}`}>
                  Nova Technology ERP — Timetable Schedule
                </h2>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground mt-1">
                  <span>Department: <strong>{filterDept}</strong></span>
                  <span>Semester: <strong>{filterSemester}</strong></span>
                  <span>Shift: <strong>{filterShift}</strong></span>
                  <span>Generated: <strong>{new Date().toLocaleString()}</strong></span>
                </div>
              </div>
              <div className="text-right">
                <span
                  style={
                    exportMode === "color"
                      ? { backgroundColor: "#eff6ff", color: "#1d4ed8", borderColor: "#93c5fd" }
                      : { backgroundColor: "#f4f4f5", color: "#000000", borderColor: "#000000" }
                  }
                  className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded border"
                >
                  {exportMode === "bw" ? "Black & White Format" : "Color Format"}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border text-xs">
                <thead>
                  <tr className={exportMode === "bw" ? "bg-zinc-200 text-black" : "bg-muted/70 text-foreground"}>
                    <th className="border p-2 text-center w-24 font-bold">Lecture</th>
                    {DAYS.map((day) => (
                      <th key={day} className="border p-2 text-left font-bold">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sequentialLecturesByDay.rows.map((lectureIdx) => (
                    <tr key={`print-lecture-${lectureIdx}`}>
                      <td className={`border p-2 font-bold text-center whitespace-nowrap ${exportMode === "bw" ? "bg-zinc-100 text-black border-zinc-400" : "bg-muted/40 text-muted-foreground"
                        }`}>
                        Lecture {lectureIdx + 1}
                      </td>
                      {DAYS.map((day) => {
                        const entry = sequentialLecturesByDay.map[day]?.[lectureIdx];

                        if (!entry) return <td key={day} className="border p-2 text-center text-muted-foreground">—</td>;

                        return (
                          <td
                            key={day}
                            style={
                              exportMode === "color"
                                ? {
                                  backgroundColor: "#eff6ff",
                                  borderColor: "#bfdbfe",
                                }
                                : {
                                  backgroundColor: "#ffffff",
                                  borderColor: "#71717a",
                                }
                            }
                            className="border p-2.5 align-top transition-all"
                          >
                            <div
                              style={
                                exportMode === "color"
                                  ? { color: "#1d4ed8" }
                                  : { color: "#000000" }
                              }
                              className="font-bold text-xs"
                            >
                              {entry.course?.courseCode}
                            </div>
                            <div className={`font-medium ${exportMode === "bw" ? "text-zinc-900" : "text-foreground"}`}>
                              {entry.course?.courseName}
                            </div>
                            <div className={`text-[11px] font-semibold ${exportMode === "bw" ? "text-zinc-700" : "text-muted-foreground"}`}>
                              Room: {entry.room}
                            </div>
                            <div className={`text-[11px] font-semibold ${exportMode === "bw" ? "text-zinc-700" : "text-muted-foreground"}`}>
                              Teacher: {entry.course?.faculty?.user?.name ?? "Unassigned"}
                            </div>
                            <div className={`text-[10px] font-mono pt-1 ${exportMode === "bw" ? "text-zinc-800 font-bold" : "text-muted-foreground"}`}>
                              {to12HourTime(entry.startTime)} – {to12HourTime(entry.endTime)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto Generator Modal Dialog */}
      <Dialog open={autoGenDialogOpen} onOpenChange={setAutoGenDialogOpen}>
        <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Auto-Generate Timetable Schedule
            </DialogTitle>
            <DialogDescription>
              Conflict-free timetable generation for <strong>{filterDept}</strong> — {programLevel === "INTERMEDIATE" ? `Part ${filterSemester}` : `Semester ${filterSemester}`} ({filterShift} Shift).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {autoGenError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold dark:bg-rose-950/30 dark:border-rose-900/60 dark:text-rose-400 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  Generation Bottleneck Detected
                </div>
                <p>{autoGenError}</p>
              </div>
            )}

            {/* Active Class Days Selector with Quick Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Active Class Days ({autoGenDays.length} Selected)
                </Label>
                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                  <span className="text-muted-foreground">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setAutoGenDays(["Monday", "Tuesday", "Wednesday", "Thursday"])}
                    className="px-2 py-0.5 rounded bg-muted hover:bg-accent text-foreground font-semibold cursor-pointer"
                  >
                    Mon–Thu
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoGenDays(["Wednesday", "Thursday"])}
                    className="px-2 py-0.5 rounded bg-muted hover:bg-accent text-foreground font-semibold cursor-pointer"
                  >
                    Wed–Thu
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoGenDays(["Friday"])}
                    className="px-2 py-0.5 rounded bg-muted hover:bg-accent text-foreground font-semibold cursor-pointer"
                  >
                    Friday Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoGenDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])}
                    className="px-2 py-0.5 rounded bg-muted hover:bg-accent text-foreground font-semibold cursor-pointer"
                  >
                    All Days
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 p-3 rounded-2xl border border-border bg-card">
                {DAYS.map((d) => {
                  const isChecked = autoGenDays.includes(d);
                  return (
                    <label key={d} className="flex items-center gap-2 text-xs font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setAutoGenDays((prev) =>
                            prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d]
                          );
                        }}
                        className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                      />
                      <span className={isChecked ? "text-foreground font-bold" : "text-muted-foreground"}>{d}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Available Rooms Input & Quick Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label htmlFor="rooms-input" className="text-xs font-semibold text-muted-foreground uppercase">
                  Available Rooms & Labs
                </Label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-muted-foreground">Quick Add:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!autoGenRoomsInput.toLowerCase().includes("online")) {
                        setAutoGenRoomsInput((prev) => (prev ? `${prev}, Online Room` : "Online Room"));
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 cursor-pointer"
                  >
                    + Online Room
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!autoGenRoomsInput.toLowerCase().includes("lab 1")) {
                        setAutoGenRoomsInput((prev) => (prev ? `${prev}, Lab 1` : "Lab 1"));
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-muted hover:bg-accent text-foreground font-semibold cursor-pointer"
                  >
                    + Lab 1
                  </button>
                </div>
              </div>
              <Input
                id="rooms-input"
                value={autoGenRoomsInput}
                onChange={(e) => setAutoGenRoomsInput(e.target.value)}
                placeholder="e.g. Room 101, Room 102, Online Room"
                className="rounded-xl font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Rooms separated by commas. Enter physical room numbers or &quot;Online Room&quot; for virtual lectures.
              </p>
            </div>

            {/* Per-Course Weekly Slot Allocation Table */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                <span>Course Weekly Slot Allocation ({primaryCourses.length} Courses)</span>
                <span className="text-[10px] normal-case text-muted-foreground">Defaulted to Credit Hours</span>
              </Label>
              <div className="space-y-2 p-3 rounded-2xl border border-border bg-card">
                {primaryCourses.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 p-2 font-medium">
                    ⚠️ No courses found for {filterDept} Sem {filterSemester}. Please add courses in Manage Courses first.
                  </p>
                ) : (
                  primaryCourses.map((c) => {
                    const teacher = getTeacherForCourseAndShift(c, filterShift);
                    const isAssigned = teacher && teacher !== "Unassigned";
                    const slotsCount = courseSlotTargets[c.id] ?? c.creditHours ?? 3;

                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between text-xs p-2.5 rounded-xl border border-border bg-background gap-3 flex-wrap"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-bold text-foreground block">
                              {c.courseCode} — {c.courseName}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Credit Hours: {c.creditHours || 3}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2.5 py-1 rounded-md ${isAssigned ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}>
                            {isAssigned ? teacher : "Unassigned"}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground font-medium">Lectures/Week:</span>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={slotsCount}
                              onChange={(e) => {
                                const val = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                                setCourseSlotTargets((prev) => ({ ...prev, [c.id]: val }));
                              }}
                              className="w-16 h-8 text-xs font-bold text-center rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Overwrite Existing Schedule Toggle */}
            <div className="p-3 rounded-2xl border border-border bg-muted/30">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoGenOverwrite}
                  onChange={(e) => setAutoGenOverwrite(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Overwrite Existing Schedule for {filterDept} {programLevel === "INTERMEDIATE" ? `Part ${filterSemester}` : `Sem ${filterSemester}`} ({filterShift})
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Clears previous timetable slots for this target section before saving to prevent duplicate classes.
                  </span>
                </div>
              </label>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Guaranteed Conflict-Free CSP Engine
              </p>
              <p>The TypeScript CSP solver checks room availability and teacher schedules across all college departments to eliminate double-booking.</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAutoGenDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleAutoGenerateTimetable}
              disabled={autoGenGenerating || primaryCourses.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold gap-2 shadow-lg shadow-emerald-600/20"
            >
              {autoGenGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Running CSP Engine...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate Conflict-Free Schedule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
