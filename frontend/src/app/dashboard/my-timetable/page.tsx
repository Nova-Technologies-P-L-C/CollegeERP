"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/axios";
import { RefreshCw, Calendar, Download, Palette, FileText } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { motion } from "framer-motion";
import { TableSkeleton } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface TimetableEntry {
  id: string;
  courseId: string;
  room: string;
  day: string;
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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const COLOR_PALETTE = [
  {
    bg: "bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    hexBg: "#eff6ff",
    hexText: "#1d4ed8",
    hexBorder: "#93c5fd",
  },
  {
    bg: "bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    hexBg: "#ecfdf5",
    hexText: "#047857",
    hexBorder: "#6ee7b7",
  },
  {
    bg: "bg-purple-500/15",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
    hexBg: "#faf5ff",
    hexText: "#7e22ce",
    hexBorder: "#c084fc",
  },
  {
    bg: "bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    hexBg: "#fffbeb",
    hexText: "#b45309",
    hexBorder: "#fcd34d",
  },
  {
    bg: "bg-rose-500/15",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
    hexBg: "#fff1f2",
    hexText: "#be123c",
    hexBorder: "#fda4af",
  },
  {
    bg: "bg-cyan-500/15",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/30",
    hexBg: "#ecfeff",
    hexText: "#0e7490",
    hexBorder: "#67e8f9",
  },
];

interface StudentProfile {
  department: string;
  semester: number;
  shift: string;
}

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const format12Hour = (timeStr: string) => {
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr} ${ampm}`;
};

export default function MyTimetablePage() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSlotModal, setSelectedSlotModal] = useState<TimetableEntry | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);
  const [exportMode, setExportMode] = useState<"color" | "bw">("color");

  const fetchTimetableData = useCallback(async () => {
    try {
      const [ttRes, profileRes] = await Promise.all([
        api.get<TimetableEntry[]>("/api/timetable"),
        api.get<{ studentProfile?: StudentProfile }>("/api/dashboard/student").catch(() => null)
      ]);
      const rawTimetable = Array.isArray(ttRes.data) ? ttRes.data : [];
      const filteredTimetable = rawTimetable.filter(
        (t) => t.course?.courseCode?.toUpperCase() !== "CC-411"
      );
      setTimetable(filteredTimetable);
      if (profileRes && profileRes.data && profileRes.data.studentProfile) {
        setStudentProfile(profileRes.data.studentProfile);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimetableData();
  }, [fetchTimetableData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTimetableData();
    setRefreshing(false);
  };

  const uniqueCourses = useMemo(() => {
    const seen = new Set<string>();
    return timetable.filter((t) => {
      if (seen.has(t.course.courseCode)) return false;
      seen.add(t.course.courseCode);
      return true;
    });
  }, [timetable]);

  const courseColors = useMemo(() => {
    const map: Record<
      string,
      { bg: string; text: string; border: string; hexBg: string; hexText: string; hexBorder: string }
    > = {};
    uniqueCourses.forEach((t, i) => {
      map[t.course.courseCode] = COLOR_PALETTE[i % COLOR_PALETTE.length];
    });
    return map;
  }, [uniqueCourses]);

  const sequentialLecturesByDay = useMemo(() => {
    const map: Record<string, TimetableEntry[]> = {};
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

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const todayName = days[new Date().getDay()];

  const isCurrentSlot = (day: string, slot: { start: string; end: string }) => {
    if (day !== todayName) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startM = timeToMinutes(slot.start);
    const endM = timeToMinutes(slot.end);
    return currentMinutes >= startM && currentMinutes < endM;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse border-2 border-border" />
          <div className="h-4 w-56 bg-muted animate-pulse border-2 border-border" />
        </div>
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
        title="My Timetable"
        subtitle="Your weekly class schedule"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Timetable" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPdfModalOpen(true)}
              className="geo-pressable flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 shadow-[2px_2px_0px_0px_var(--border)] cursor-pointer rounded-xl font-bold text-xs"
            >
              <Download className="h-4 w-4 text-brand-primary" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="geo-pressable flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 shadow-[2px_2px_0px_0px_var(--border)] cursor-pointer rounded-xl font-bold text-xs"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Timetable Grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/55">
                <th className="text-center py-3 px-3 font-bold text-xs uppercase tracking-wider text-muted-foreground w-24">
                  Lecture
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className={`text-center py-3 px-2 font-semibold min-w-[90px] ${day === todayName
                        ? "text-brand-primary bg-brand-primary/5"
                        : "text-foreground"
                      }`}
                  >
                    {day}
                    {day === todayName && (
                      <span className="block text-[10px] font-normal text-brand-primary">
                        Today
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sequentialLecturesByDay.rows.map((lectureIdx) => (
                <tr key={`lecture-${lectureIdx}`} className="border-b border-border/50">
                  <td className="py-3 px-3 text-center text-xs font-bold text-muted-foreground whitespace-nowrap">
                    Lecture {lectureIdx + 1}
                  </td>
                  {DAYS.map((day) => {
                    const cls = sequentialLecturesByDay.map[day]?.[lectureIdx];
                    const isCurrent = cls ? isCurrentSlot(day, { start: cls.startTime, end: cls.endTime }) : false;
                    const colors = cls
                      ? courseColors[cls.course.courseCode]
                      : null;

                    if (cls) {
                      return (
                        <td
                          key={`${day}-${cls.id}`}
                          className={`p-1 ${isCurrent ? "ring-2 ring-brand-primary ring-inset" : ""}`}
                        >
                          <div
                            onClick={() => setSelectedSlotModal(cls)}
                            className={`rounded-xl p-3 h-full ${colors?.bg} border ${colors?.border} hover:scale-[1.02] cursor-pointer shadow-xs transition-all flex flex-col justify-between space-y-1.5`}
                          >
                            <div className="space-y-1">
                              {/* 1. Day Badge */}
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-background/60 text-foreground/80 border border-border/40">
                                  {day}
                                </span>
                                <span className="text-[9px] font-medium text-foreground/75">
                                  {cls.room}
                                </span>
                              </div>

                              {/* 2. Subject */}
                              <div className="pt-0.5">
                                <p
                                  className={`text-xs font-bold ${colors?.text} leading-tight break-words`}
                                  title={cls.course.courseCode}
                                >
                                  {cls.course.courseCode}
                                </p>
                                <p
                                  className="text-[10px] text-foreground/90 font-semibold break-words mt-0.5"
                                  title={cls.course.courseName}
                                >
                                  {cls.course.courseName}
                                </p>
                              </div>

                              {/* 3. Teacher (plain text name, no icon) */}
                              <p className="text-[10px] font-medium text-foreground/80">
                                {cls.course.faculty?.user.name || "Not assigned"}
                              </p>
                            </div>

                            {/* 4. Time */}
                            <p className="text-[9px] font-mono text-muted-foreground/90 pt-1 border-t border-border/20">
                              {format12Hour(cls.startTime)} – {format12Hour(cls.endTime)}
                            </p>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={`${day}-empty-${lectureIdx}`}
                        className="p-1"
                      >
                        <div className="h-10" />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timetable Slot Details Pop-up Dialog */}
      <Dialog open={!!selectedSlotModal} onOpenChange={(open) => { if (!open) setSelectedSlotModal(null); }}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-primary" />
              Class Session Details
            </DialogTitle>
          </DialogHeader>

          {selectedSlotModal && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 space-y-1">
                <span className="text-xs font-mono font-bold text-brand-primary uppercase tracking-wider">Course Code</span>
                <h3 className="text-xl font-black text-foreground">{selectedSlotModal.course.courseCode}</h3>
                <p className="text-sm font-semibold text-foreground/90">{selectedSlotModal.course.courseName}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Faculty Instructor</span>
                  <span className="font-bold text-foreground text-sm">{selectedSlotModal.course.faculty?.user.name || "Unassigned"}</span>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Classroom / Venue</span>
                  <span className="font-bold text-foreground text-sm">{selectedSlotModal.room}</span>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Day & Semester</span>
                  <span className="font-bold text-foreground text-sm">{selectedSlotModal.day} (Sem {selectedSlotModal.course.semester})</span>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Time Duration</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {format12Hour(selectedSlotModal.startTime)} – {format12Hour(selectedSlotModal.endTime)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSlotModal(null)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Timetable PDF Dialog */}
      <Dialog open={pdfModalOpen} onOpenChange={setPdfModalOpen}>
        <DialogContent className="sm:max-w-4xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Download className="h-5 w-5 text-brand-primary" />
                Timetable PDF Export Preview
              </DialogTitle>
              <DialogDescription>
                Preview and print your weekly timetable schedule.
              </DialogDescription>

              {/* Format Selector Toggle: Color vs Black & White */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-bold text-muted-foreground">Print Format:</span>
                <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setExportMode("color")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      exportMode === "color"
                        ? "bg-brand-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Palette className="h-3.5 w-3.5" /> Color
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportMode("bw")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      exportMode === "bw"
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
                  const printContent = document.getElementById("printable-my-timetable-area");
                  if (!printContent) return;
                  const win = window.open("", "", "width=1200,height=900");
                  if (!win) return;
                  win.document.write(`<!doctype html><html><head><title>My Timetable Schedule</title><style>*{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; } body{ font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #111827; } table{ width: 100%; border-collapse: collapse; margin-top: 12px; } th, td{ border: 1px solid ${exportMode === "bw" ? "#000000" : "#cbd5e1"}; padding: 8px 10px; font-size: 11px; vertical-align: top; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } th{ background-color: ${exportMode === "bw" ? "#e2e8f0" : "#f1f5f9"}; color: #000000; } @media print{ *{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }</style></head><body>${printContent.innerHTML}</body></html>`);
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
            id="printable-my-timetable-area"
            className={`p-5 rounded-2xl border transition-all space-y-4 ${
              exportMode === "bw"
                ? "bg-white text-black border-zinc-400"
                : "bg-white dark:bg-zinc-900 text-foreground border-border"
            }`}
          >
            <div className="border-b pb-3 flex justify-between items-end">
              <div>
                <h2 className={`text-lg font-bold ${exportMode === "bw" ? "text-black" : "text-brand-primary"}`}>
                  Nova Technology ERP — Class Schedule
                </h2>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground mt-1">
                  {studentProfile && (
                    <>
                      <span>Dept: <strong>{studentProfile.department}</strong></span>
                      <span>Semester: <strong>{studentProfile.semester}</strong></span>
                      <span>Shift: <strong>{studentProfile.shift}</strong></span>
                    </>
                  )}
                  <span>Generated: <strong>{new Date().toLocaleDateString()}</strong></span>
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
                    {DAYS.map((d) => (
                      <th key={d} className="border p-2 text-left font-bold">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sequentialLecturesByDay.rows.map((lectureIdx) => (
                    <tr key={`student-print-lecture-${lectureIdx}`}>
                      <td className={`border p-2 font-bold text-center whitespace-nowrap ${
                        exportMode === "bw" ? "bg-zinc-100 text-black border-zinc-400" : "bg-muted/40 text-muted-foreground"
                      }`}>
                        Lecture {lectureIdx + 1}
                      </td>
                      {DAYS.map((day) => {
                        const entry = sequentialLecturesByDay.map[day]?.[lectureIdx];

                        if (!entry) return <td key={day} className="border p-2 text-center text-muted-foreground">—</td>;

                        const colors = courseColors[entry.course.courseCode];

                        return (
                          <td
                            key={day}
                            style={
                              exportMode === "color"
                                ? {
                                    backgroundColor: colors?.hexBg ?? "#eff6ff",
                                    borderColor: colors?.hexBorder ?? "#93c5fd",
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
                                  ? { color: colors?.hexText ?? "#1d4ed8" }
                                  : { color: "#000000" }
                              }
                              className="font-bold text-xs"
                            >
                              {entry.course.courseCode}
                            </div>
                            <div className={`font-medium ${exportMode === "bw" ? "text-zinc-900" : "text-foreground"}`}>
                              {entry.course.courseName}
                            </div>
                            <div className={`text-[11px] font-semibold ${exportMode === "bw" ? "text-zinc-700" : "text-muted-foreground"}`}>
                              Room: {entry.room}
                            </div>
                            <div className={`text-[11px] font-semibold ${exportMode === "bw" ? "text-zinc-700" : "text-muted-foreground"}`}>
                              Teacher: {entry.course.faculty?.user?.name ?? "Unassigned"}
                            </div>
                            <div className={`text-[10px] font-mono pt-1 ${exportMode === "bw" ? "text-zinc-800 font-bold" : "text-muted-foreground"}`}>
                              {format12Hour(entry.startTime)} – {format12Hour(entry.endTime)}
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
    </motion.div>
  );
}
