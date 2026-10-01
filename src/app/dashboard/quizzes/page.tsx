"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useStoredState } from "@/hooks/useStoredState";
import { FileText, Plus, Clock, Users, Eye, CheckCircle, Play, Square, Loader2, Trash2, RefreshCw } from "lucide-react";
import { api } from "@/lib/axios";
import { AuditBadgeInline } from "@/components/dashboard/AuditBadge";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { getLocalTodayString } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ListSkeleton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface ApiCourse {
  id: string;
  courseCode: string;
  courseName: string;
  creditHours: number;
  department: string;
  semester: number;
}

interface ApiQuestion {
  id: string;
  courseId?: string;
  type?: "MCQ" | "Short" | "Long";
  text: string;
  options: string[];
  correctOption: number | null;
  marks?: number;
  quizId: string | null;
}

interface ApiQuiz {
  id: string;
  title: string;
  courseId: string;
  createdBy: string;
  duration: number;
  totalMarks: number;
  status: "Draft" | "Published" | "Closed";
  dueDate: string;
  _count: { questions: number; attempts: number };
  course: { courseCode: string; courseName: string };
}

interface QuizAttempt {
  id: string;
  student: { rollNo: string; user: { name: string | null } };
  score: number;
  totalMarks: number;
  submittedAt: string;
}

const statusColors: Record<string, string> = {
  Draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  Published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Closed: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

export default function ManageQuizzesPage() {
  const [activeSubTab, setActiveSubTab] = useStoredState<"quizzes" | "assignments">("faculty_quizzes_subtab", "quizzes");
  const [quizzes, setQuizzes] = useState<ApiQuiz[]>([]);
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showResults] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [togglingQuizId, setTogglingQuizId] = useState<string | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [attempts] = useState<Record<string, QuizAttempt[]>>({});
  const [loadingAttempts] = useState<string | null>(null);
  const [submissionModalQuiz, setSubmissionModalQuiz] = useState<ApiQuiz | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<{ id: string; rollNo: string; name: string; submitted: boolean; score?: number; totalMarks?: number }[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [togglingStudentSubmission, setTogglingStudentSubmission] = useState<string | null>(null);

  const filteredByTabQuizzes = useMemo(() => {
    if (activeSubTab === "assignments") {
      return quizzes.filter((q) => q.title.toLowerCase().includes("assignment"));
    }
    return quizzes.filter((q) => !q.title.toLowerCase().includes("assignment"));
  }, [quizzes, activeSubTab]);
  const quizIdCounter = useRef(0);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formCourse, setFormCourse] = useState("");
  const [formDuration, setFormDuration] = useState(15);
  const [formMarks, setFormMarks] = useState(20);
  const [formQuestions, setFormQuestions] = useState<string[]>([]);
  const [formDueDate, setFormDueDate] = useState(getLocalTodayString());

  const fetchQuizzes = async () => {
    try {
      const res = await api.get<ApiQuiz[]>("/api/quizzes");
      setQuizzes(res.data);
    } catch {
      setQuizzes([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchQuizzes(),
          api.get<ApiCourse[]>("/api/courses").then((res) => setCourses(res.data)),
          api.get<ApiQuestion[]>("/api/questions").then((res) => setQuestions(res.data)),
        ]);
      } catch {
        // partial fail handled by individual setters if needed
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleStatusToggle = async (quizId: string, newStatus: ApiQuiz["status"]) => {
    setTogglingQuizId(quizId);
    try {
      await api.patch(`/api/quizzes/${quizId}`, { status: newStatus });
      await fetchQuizzes();
    } catch {
      // silent fail
    } finally {
      setTogglingQuizId(null);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    setDeletingQuizId(quizId);
    try {
      await api.delete(`/api/quizzes/${quizId}`);
      await fetchQuizzes();
    } catch {
      // silent fail
    } finally {
      setDeletingQuizId(null);
    }
  };

  const handleCreate = async () => {
    if (!formTitle || !formCourse || formQuestions.length === 0 || !formDueDate) return;
    setCreating(true);
    const finalTitle = activeSubTab === "assignments" && !formTitle.toLowerCase().includes("assignment")
      ? `[Assignment] ${formTitle}`
      : formTitle;
    try {
      await api.post("/api/quizzes", {
        title: finalTitle,
        courseId: formCourse,
        duration: formDuration,
        totalMarks: formMarks,
        dueDate: formDueDate,
        status: "Draft",
        questionIds: formQuestions,
      });
      await fetchQuizzes();
      setShowCreate(false);
      resetForm();
    } catch {
      // silent fail
    } finally {
      setCreating(false);
    }
    quizIdCounter.current++;
  };

  const resetForm = () => {
    setFormTitle("");
    setFormCourse("");
    setFormDuration(15);
    setFormMarks(20);
    setFormQuestions([]);
    setFormDueDate(getLocalTodayString());
  };

  const toggleQuestion = (qId: string) => {
    setFormQuestions((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const courseQuestions = useMemo(() => {
    if (!formCourse) return [];
    return questions.filter((q) => q.courseId === formCourse || !q.courseId);
  }, [formCourse, questions]);

  useEffect(() => {
    if (formQuestions.length > 0) {
      const selected = questions.filter((q) => formQuestions.includes(q.id));
      const total = selected.reduce((acc, q) => acc + (q.marks || 1), 0);
      setFormMarks(total > 0 ? total : 10);
    }
  }, [formQuestions, questions]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse border-2 border-border" />
            <div className="h-4 w-72 bg-muted animate-pulse border-2 border-border" />
          </div>
          <div className="h-10 w-36 bg-muted animate-pulse border-2 border-border" />
        </div>
        <ListSkeleton count={4} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <PageHeader
        title="Quizzes & Assignments"
        subtitle="Create, publish, and review quiz results"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Quizzes" }]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setLoading(true);
                await fetchQuizzes();
                setLoading(false);
              }}
              className="gap-2 rounded-xl border-2"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button onClick={() => { resetForm(); setShowCreate(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> {activeSubTab === "quizzes" ? "Create Quiz" : "Create Assignment"}
            </Button>
          </div>
        }
      />

      {/* Sub-Tabs: Quizzes vs Assignments */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveSubTab("quizzes")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeSubTab === "quizzes"
              ? "bg-brand-primary text-white shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Quiz - Online MCQs
        </button>
        <button
          onClick={() => setActiveSubTab("assignments")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeSubTab === "assignments"
              ? "bg-brand-primary text-white shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Assignment - Hardform Submission
        </button>
      </div>

      {/* Quiz / Assignment List */}
      <div className="space-y-4">
        {filteredByTabQuizzes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold text-foreground">No {activeSubTab === "quizzes" ? "quizzes" : "assignments"} found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click &quot;Create New&quot; above to add a new {activeSubTab === "quizzes" ? "quiz" : "assignment"}.
            </p>
          </div>
        ) : (
          filteredByTabQuizzes.map((quiz) => (
          <motion.div
            key={quiz.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-foreground">{quiz.title}</h3>
                  <Badge variant="secondary" className={statusColors[quiz.status]}>{quiz.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {quiz.course?.courseCode} • {quiz._count.questions} questions • {quiz.duration} mins • {quiz.totalMarks} marks
                </p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Due: {new Date(quiz.dueDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {quiz._count.attempts} attempted
                  </span>
                  <AuditBadgeInline entity="Quiz" entityId={quiz.id} />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {quiz.status === "Draft" && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusToggle(quiz.id, "Published")} className="gap-1 text-emerald-600" disabled={togglingQuizId !== null}>
                    {togglingQuizId === quiz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Publish
                  </Button>
                )}
                {quiz.status === "Published" && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusToggle(quiz.id, "Closed")} className="gap-1 text-rose-600" disabled={togglingQuizId !== null}>
                    {togglingQuizId === quiz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />} Close
                  </Button>
                )}
                {quiz.status !== "Draft" && activeSubTab === "quizzes" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setSubmissionModalQuiz(quiz);
                      setLoadingSubmissions(true);
                      try {
                        const [courseRes, attRes] = await Promise.all([
                          api.get<{ enrollments?: { student: { id: string; rollNo: string; user: { name: string | null } } }[] }>(`/api/courses/${quiz.courseId}`),
                          api.get<QuizAttempt[]>(`/api/quizzes/${quiz.id}/attempts`).catch(() => ({ data: [] })),
                        ]);
                        const studentsList = (courseRes.data.enrollments || []).map((e) => e.student).filter(Boolean);
                        const attemptMap = new Map((attRes.data || []).map((a) => [a.student.rollNo, a]));
                        setEnrolledStudents(
                          studentsList.map((s) => {
                            const att = attemptMap.get(s.rollNo);
                            return {
                              id: s.id,
                              rollNo: s.rollNo,
                              name: s.user?.name || "Student",
                              submitted: !!att,
                              score: att?.score,
                              totalMarks: att?.totalMarks || quiz.totalMarks,
                            };
                          })
                        );
                      } catch (err) {
                        console.error("Failed to load quiz results:", err);
                        setEnrolledStudents([]);
                      } finally {
                        setLoadingSubmissions(false);
                      }
                    }}
                    className="gap-1 rounded-xl font-bold border-brand-primary/30 text-brand-primary hover:bg-brand-primary hover:text-white"
                  >
                    <Eye className="h-3.5 w-3.5" /> Results
                  </Button>
                )}
                {activeSubTab === "assignments" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setSubmissionModalQuiz(quiz);
                      setLoadingSubmissions(true);
                      try {
                        const [courseRes, attRes] = await Promise.all([
                          api.get<{ enrollments?: { student: { id: string; rollNo: string; user: { name: string | null } } }[] }>(`/api/courses/${quiz.courseId}`),
                          api.get<QuizAttempt[]>(`/api/quizzes/${quiz.id}/attempts`).catch(() => ({ data: [] })),
                        ]);
                        const studentsList = (courseRes.data.enrollments || []).map((e) => e.student).filter(Boolean);
                        const submittedStudentIds = new Set((attRes.data || []).map((a) => a.student.rollNo));
                        setEnrolledStudents(
                          studentsList.map((s) => ({
                            id: s.id,
                            rollNo: s.rollNo,
                            name: s.user?.name || "Student",
                            submitted: submittedStudentIds.has(s.rollNo),
                          }))
                        );
                      } catch (err) {
                        console.error("Failed to load submission status:", err);
                        setEnrolledStudents([]);
                      } finally {
                        setLoadingSubmissions(false);
                      }
                    }}
                    disabled={quiz.status === "Draft"}
                    title={quiz.status === "Draft" ? "Submissions are disabled until published" : "View student submissions"}
                    className="gap-1 bg-amber-600 hover:bg-amber-600/80 text-white font-semibold rounded-xl shadow-xs transition-opacity disabled:opacity-40 disabled:cursor-not-allowed border-none"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Submissions
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="gap-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  disabled={deletingQuizId === quiz.id}
                >
                  {deletingQuizId === quiz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
                </Button>
              </div>
            </div>

             {/* Results Dropdown */}
            <AnimatePresence>
              {showResults === quiz.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Student Results
                    </h4>
                    {loadingAttempts === quiz.id ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
                      </div>
                    ) : attempts[quiz.id]?.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border bg-muted/30 text-left">
                              <th className="p-2 font-semibold text-foreground">Student</th>
                              <th className="p-2 font-semibold text-foreground">Roll No</th>
                              <th className="p-2 font-semibold text-foreground text-center">Status</th>
                              <th className="p-2 font-semibold text-foreground text-center">Score</th>
                              <th className="p-2 font-semibold text-foreground">Submitted At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attempts[quiz.id].map((attempt) => (
                              <tr key={attempt.id} className="border-b border-border last:border-0">
                                <td className="p-2 font-medium text-foreground">{attempt.student.user.name || "—"}</td>
                                <td className="p-2 font-mono text-muted-foreground">{attempt.student.rollNo}</td>
                                <td className="p-2 text-center">
                                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold py-0.5 px-2">
                                    Attempted ✓
                                  </Badge>
                                </td>
                                <td className="p-2 text-center font-bold text-brand-primary">
                                  {attempt.score} / {attempt.totalMarks}
                                </td>
                                <td className="p-2 text-muted-foreground">
                                  {new Date(attempt.submittedAt).toLocaleString(undefined, {
                                    dateStyle: "short",
                                    timeStyle: "short"
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No student attempts recorded.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))
      )}
      </div>

      {/* Create Quiz / Assignment Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeSubTab === "quizzes" ? "Create New Quiz" : "Create New Assignment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {activeSubTab === "quizzes" ? "Quiz Title" : "Assignment Title"}
              </label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={activeSubTab === "quizzes" ? "e.g. Midterm MCQs Quiz" : "e.g. Chapter 4 Practice Assignment"}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Course</label>
              <Select value={formCourse} onValueChange={(v) => { setFormCourse(v); setFormQuestions([]); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.courseCode} — {c.courseName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeSubTab !== "assignments" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Duration (mins)</label>
                  <Input type="number" value={formDuration} onChange={(e) => setFormDuration(+e.target.value)} min={5} max={120} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Total Marks</label>
                  <Input type="number" value={formMarks} onChange={(e) => setFormMarks(+e.target.value)} min={1} />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Due Date</label>
              <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
            </div>

            {/* Question Selection for Quiz (MCQs Only) vs Assignment (Questions Only) */}
            {formCourse && (() => {
              const availableQuestions = courseQuestions.filter((q) =>
                activeSubTab === "quizzes" ? (q.type || "MCQ") === "MCQ" : (q.type || "MCQ") !== "MCQ"
              );

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground block">
                      Select {activeSubTab === "quizzes" ? "MCQ Questions" : "Assignment Questions"} ({formQuestions.length} selected)
                    </label>
                    {availableQuestions.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const availIds = availableQuestions.map((q) => q.id);
                          const allSelected = availIds.every((id) => formQuestions.includes(id));
                          if (allSelected) {
                            setFormQuestions((prev) => prev.filter((id) => !availIds.includes(id)));
                          } else {
                            setFormQuestions((prev) => Array.from(new Set([...prev, ...availIds])));
                          }
                        }}
                        className="h-7 text-xs px-2 text-brand-primary font-bold hover:bg-brand-primary/10 rounded-lg"
                      >
                        {availableQuestions.every((q) => formQuestions.includes(q.id)) ? "Deselect All" : "Select All"}
                      </Button>
                    )}
                  </div>

                  {availableQuestions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No {activeSubTab === "quizzes" ? "MCQ" : "non-MCQ"} questions available for this course. Add {activeSubTab === "quizzes" ? "MCQs" : "questions"} in the Question Bank first.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto rounded-xl border border-border p-2">
                      {availableQuestions.map((q) => {
                        const isSelected = formQuestions.includes(q.id);
                        const qType = q.type || "MCQ";
                        const typeBadgeClass =
                          qType === "MCQ"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => toggleQuestion(q.id)}
                            className={`w-full text-left rounded-xl p-3 text-xs transition-all border ${
                              isSelected
                                ? "bg-brand-primary/10 border-brand-primary/40 shadow-xs"
                                : "bg-card hover:bg-accent/40 border-border"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center mt-0.5 ${
                                isSelected ? "border-brand-primary bg-brand-primary" : "border-muted-foreground/30"
                              }`}>
                                {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary" className={`text-[10px] py-0 px-1.5 font-bold ${typeBadgeClass}`}>
                                    {qType === "MCQ" ? "MCQ" : "Question"}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {q.marks || 1} {q.marks === 1 ? "Mark" : "Marks"}
                                  </span>
                                </div>
                                <span className="text-foreground font-medium block leading-snug">{q.text}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formTitle || !formCourse || formQuestions.length === 0 || !formDueDate || creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz & Assignment Submissions / Results Dialog */}
      <Dialog open={!!submissionModalQuiz} onOpenChange={(open) => { if (!open) setSubmissionModalQuiz(null); }}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-brand-primary" />
              {activeSubTab === "assignments" ? "Assignment Submissions" : "Quiz Results"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {submissionModalQuiz?.title} ({submissionModalQuiz?.course?.courseCode}) • {enrolledStudents.filter((s) => s.submitted).length}/{enrolledStudents.length} Submitted
            </p>
          </DialogHeader>

          <div className="py-2 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {loadingSubmissions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
              </div>
            ) : enrolledStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No enrolled students found in this course.</p>
            ) : (
              <div className="space-y-2">
                {enrolledStudents.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border hover:bg-accent/20 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-xs text-foreground">{st.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{st.rollNo}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {activeSubTab === "quizzes" ? (
                        st.submitted ? (
                          <div className="flex items-center gap-2.5">
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold text-[11px] py-1 px-2.5">
                              Attempted ✓
                            </Badge>
                            <div className="text-right">
                              <p className="text-sm font-extrabold text-brand-primary">
                                {st.score !== undefined ? `${st.score} / ${st.totalMarks}` : "Submitted"}
                              </p>
                              {st.score !== undefined && st.totalMarks && st.totalMarks > 0 && (
                                <p className="text-[10px] font-bold text-muted-foreground">
                                  {Math.round((st.score / st.totalMarks) * 100)}% Score
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic font-mono">Not Attempted</span>
                        )
                      ) : (
                        (() => {
                          const isClosedOrEnded =
                            submissionModalQuiz?.status === "Closed" ||
                            (submissionModalQuiz?.dueDate
                              ? new Date(submissionModalQuiz.dueDate).getTime() < Date.now()
                              : false);

                          return (
                            <Button
                              size="sm"
                              variant={st.submitted ? "default" : "outline"}
                              disabled={isClosedOrEnded || togglingStudentSubmission === st.id}
                              title={
                                isClosedOrEnded
                                  ? "Submissions are locked because this assignment is closed or past its deadline"
                                  : undefined
                              }
                              onClick={async () => {
                                if (!submissionModalQuiz || isClosedOrEnded) return;
                                setTogglingStudentSubmission(st.id);
                                try {
                                  if (st.submitted) {
                                    await api.delete(`/api/quizzes/${submissionModalQuiz.id}/submit?studentId=${st.id}`);
                                    setEnrolledStudents((prev) =>
                                      prev.map((s) => (s.id === st.id ? { ...s, submitted: false, score: undefined } : s))
                                    );
                                  } else {
                                    await api.post(`/api/quizzes/${submissionModalQuiz.id}/submit`, {
                                      studentId: st.id,
                                      score: submissionModalQuiz.totalMarks,
                                      answers: [],
                                    });
                                    setEnrolledStudents((prev) =>
                                      prev.map((s) => (s.id === st.id ? { ...s, submitted: true, score: submissionModalQuiz.totalMarks } : s))
                                    );
                                  }
                                } catch (err) {
                                  console.error("Failed to toggle submission:", err);
                                } finally {
                                  setTogglingStudentSubmission(null);
                                }
                              }}
                              className={`h-8 text-xs rounded-xl font-bold transition-all ${
                                isClosedOrEnded
                                  ? "opacity-50 cursor-not-allowed border-muted text-muted-foreground"
                                  : st.submitted
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                              }`}
                            >
                              {togglingStudentSubmission === st.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isClosedOrEnded ? (
                                st.submitted ? "Submitted (Locked)" : "Closed"
                              ) : st.submitted ? (
                                "Submitted ✓"
                              ) : (
                                "Mark Submitted"
                              )}
                            </Button>
                          );
                        })()
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmissionModalQuiz(null)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
