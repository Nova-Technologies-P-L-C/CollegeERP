"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/axios";
import { Save, CheckCircle, Trash2, RefreshCw } from "lucide-react";
import { AuditBadgeInline } from "@/components/dashboard/AuditBadge";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface GradeEntry {
  id: string;
  studentId: string;
  courseId: string;
  quizMarks: number;
  assignmentMarks: number;
  midMarks: number;
  finalMarks: number;
  total: number;
  gpa: number;
  locked: boolean;
  student: {
    rollNo: string;
    shift: string;
    blocked: boolean;
    user: { name: string | null };
    cgpa: number;
  };
}

export default function FacultyGradesPage() {
  useUser();
  const { programLevel } = useProgramLevel();
  const isInter = programLevel === "INTERMEDIATE";

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedShift, setSelectedShift] = useState("morning");
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [focusedInput, setFocusedInput] = useState<{ id: string; field: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch initial assigned courses list and pre-select defaults
  const fetchCourses = useCallback(async () => {
    try {
      const res = await api.get<CourseOption[]>(`/api/courses?programLevel=${programLevel}`);
      const list = Array.isArray(res.data) ? res.data : [];
      setCourses(list);
      if (list.length > 0) {
        const firstDept = list[0].discipline || list[0].department;
        const deptSemesters = Array.from(
          new Set(list.filter((c) => (c.discipline || c.department) === firstDept).map((c) => c.part || c.semester))
        ).sort((a, b) => a - b);
        const firstSem = deptSemesters[0];
        const matchingCourse = list.find(
          (c) => (c.discipline || c.department) === firstDept && (c.part || c.semester) === firstSem
        );

        setSelectedDept(firstDept);
        if (firstSem !== undefined) setSelectedSemester(firstSem.toString());
        if (matchingCourse) setSelectedCourse(matchingCourse.id);
      }
    } catch {
      /* ignore */
    }
  }, [programLevel]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCourses();
    if (selectedCourse) {
      setLoadingGrades(true);
      api
        .get<GradeEntry[]>(`/api/grades?courseId=${selectedCourse}`)
        .then((r) => setGrades(Array.isArray(r.data) ? r.data : []))
        .catch(() => setGrades([]))
        .finally(() => setLoadingGrades(false));
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

  // Fetch grades whenever selected course changes
  useEffect(() => {
    if (!selectedCourse) {
      setGrades([]);
      return;
    }
    setSaved(false);
    setLoadingGrades(true);
    api
      .get<GradeEntry[]>(`/api/grades?courseId=${selectedCourse}`)
      .then((r) => setGrades(Array.isArray(r.data) ? r.data : []))
      .catch(() => setGrades([]))
      .finally(() => setLoadingGrades(false));
  }, [selectedCourse]);

  const updateGrade = (
    gradeId: string,
    field: keyof Pick<
      GradeEntry,
      "quizMarks" | "assignmentMarks" | "midMarks" | "finalMarks"
    >,
    value: number,
  ) => {
    setGrades((prev) =>
      prev.map((g) => {
        if (g.id !== gradeId || g.locked) return g;
        const updated = { ...g, [field]: value };
        updated.quizMarks = 0;
        updated.assignmentMarks = 0;
        updated.total =
          updated.quizMarks +
          updated.assignmentMarks +
          updated.midMarks +
          updated.finalMarks;
        updated.gpa = +Math.min(4.0, (updated.total / 40) * 4.0).toFixed(2);
        return updated;
      }),
    );
  };

  const updateCgpa = (gradeId: string, value: number) => {
    setGrades((prev) =>
      prev.map((g) => {
        if (g.id !== gradeId || g.locked) return g;
        return {
          ...g,
          student: {
            ...g.student,
            cgpa: value,
          },
        };
      }),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        grades
          .filter((g) => !g.locked)
          .map((g) =>
            api.post("/api/grades", {
              studentId: g.studentId,
              courseId: g.courseId,
              quizMarks: 0,
              assignmentMarks: 0,
              midMarks: g.midMarks,
              finalMarks: g.finalMarks,
              total: g.total,
              gpa: g.gpa,
              cgpa: Number(g.student.cgpa || 0),
            }),
          ),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save grades:", err);
    } finally {
      setSaving(false);
    }
  };

  // Filter grades by shift selection
  const filteredGrades = grades.filter((g) => {
    if (selectedShift === "all") return true;
    return g.student.shift?.toLowerCase() === selectedShift.toLowerCase();
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        title="Manage Grades"
        subtitle="Enter and update student grades for your courses"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Grades" },
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

      {/* Selectors Row */}
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
        </div>
      </div>

      {loadingGrades ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          {selectedCourse && filteredGrades.length > 0 && (
            <>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left py-3 px-4 font-semibold text-foreground">
                          Student
                        </th>
                        <th className="text-left py-3 px-3 font-semibold text-foreground">
                          Roll No
                        </th>
                        <th className="text-left py-3 px-3 font-semibold text-foreground">
                          Shift
                        </th>
                        {!isInter && (
                          <>
                            <th className="text-center py-3 px-2 font-semibold text-foreground w-28">
                              Mid Exam (25)
                            </th>
                            <th className="text-center py-3 px-2 font-semibold text-foreground w-28">
                              Sessional (15)
                            </th>
                          </>
                        )}
                        <th className="text-center py-3 px-3 font-semibold text-foreground w-32">
                          Obtained Marks
                        </th>
                        <th className="text-center py-3 px-3 font-semibold text-foreground w-28">
                          Total Marks
                        </th>
                        {!isInter && (
                          <th className="text-center py-3 px-2 font-semibold text-foreground w-28">
                            Previous CGPA
                          </th>
                        )}
                        <th className="text-center py-3 px-3 font-semibold text-foreground w-28">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGrades.map((g) => {
                        return (
                          <tr
                            key={g.id}
                            className="border-b border-border/50 hover:bg-accent/20 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                  {g.student.user.name ?? "—"}
                                </span>
                                {g.student.blocked && (
                                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 uppercase font-bold tracking-wider animate-pulse">
                                    Struck Off
                                  </Badge>
                                )}
                                <AuditBadgeInline entity="Grade" entityId={g.id} />
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-muted-foreground text-xs">
                              {g.student.rollNo}
                            </td>
                            <td className="py-3 px-3">
                              <Badge
                                variant="secondary"
                                className={
                                  g.student.shift?.toLowerCase() === "morning"
                                    ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                    : "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20"
                                }
                              >
                                {g.student.shift ?? "Morning"}
                              </Badge>
                            </td>
                            {!isInter && (
                              <>
                                <td className="py-2 px-2">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={25}
                                    value={focusedInput?.id === g.id && focusedInput?.field === "midMarks" && g.midMarks === 0 ? "" : g.midMarks}
                                    onChange={(e) =>
                                      updateGrade(g.id, "midMarks", +e.target.value)
                                    }
                                    onFocus={() => setFocusedInput({ id: g.id, field: "midMarks" })}
                                    onBlur={() => setFocusedInput(null)}
                                    className="text-center h-8 w-16 mx-auto bg-card border-2"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={15}
                                    value={focusedInput?.id === g.id && focusedInput?.field === "finalMarks" && g.finalMarks === 0 ? "" : g.finalMarks}
                                    onChange={(e) =>
                                      updateGrade(g.id, "finalMarks", +e.target.value)
                                    }
                                    onFocus={() => setFocusedInput({ id: g.id, field: "finalMarks" })}
                                    onBlur={() => setFocusedInput(null)}
                                    className="text-center h-8 w-16 mx-auto bg-card border-2"
                                  />
                                </td>
                              </>
                            )}
                            <td className="py-2 px-2">
                              {isInter ? (
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={focusedInput?.id === g.id && focusedInput?.field === "total" && g.total === 0 ? "" : g.total}
                                  onChange={(e) => {
                                    const val = +e.target.value;
                                    setGrades((prev) =>
                                      prev.map((item) =>
                                        item.id === g.id ? { ...item, total: val, midMarks: val, finalMarks: 0 } : item
                                      )
                                    );
                                  }}
                                  onFocus={() => setFocusedInput({ id: g.id, field: "total" })}
                                  onBlur={() => setFocusedInput(null)}
                                  className="text-center h-8 w-20 mx-auto bg-card border-2 font-bold"
                                />
                              ) : (
                                <span className="font-bold text-foreground block text-center">
                                  {g.total}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-muted-foreground">
                              {isInter ? 100 : 40}
                            </td>
                            {!isInter && (
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  max={4.0}
                                  value={focusedInput?.id === g.id && focusedInput?.field === "cgpa" && (g.student.cgpa === 0 || g.student.cgpa === undefined) ? "" : (g.student.cgpa !== undefined ? g.student.cgpa : 0.0)}
                                  onChange={(e) =>
                                    updateCgpa(g.id, +e.target.value)
                                  }
                                  onFocus={() => setFocusedInput({ id: g.id, field: "cgpa" })}
                                  onBlur={() => setFocusedInput(null)}
                                  className="text-center h-8 w-20 mx-auto bg-card border-2"
                                />
                              </td>
                            )}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center">
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.delete(`/api/grades/${g.id}`);
                                      setGrades((prev) =>
                                        prev.filter((x) => x.id !== g.id),
                                      );
                                    } catch {
                                      /* ignore */
                                    }
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-destructive/10 transition-colors"
                                  title="Delete grade"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                {saved ? (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-5 w-5 animate-bounce" />
                    <span className="text-sm font-semibold">
                      Grades saved successfully!
                    </span>
                  </div>
                ) : (
                  <Button onClick={handleSave} disabled={saving} className="gap-2 border-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Grades"}
                  </Button>
                )}
              </div>
            </>
          )}

          {selectedCourse && filteredGrades.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">
                No students/grades found matching current filters.
              </p>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

