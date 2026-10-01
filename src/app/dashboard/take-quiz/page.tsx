"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Clock, ArrowRight, Trophy, AlertCircle, RefreshCw, Loader2, Trash2, CheckCircle } from "lucide-react";
import { api } from "@/lib/axios";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui";

interface QuizQuestion {
  id: string;
  type?: string;
  text: string;
  options: string[];
  correctOption: number;
}

interface QuizWithDetails {
  id: string;
  title: string;
  courseId: string;
  createdBy: string;
  duration: number;
  totalMarks: number;
  status: "Draft" | "Published" | "Closed";
  dueDate: string;
  questions: QuizQuestion[];
  course?: { courseCode: string; courseName: string };
}

type QuizView = "list" | "attempt" | "result";

interface MyQuizAttempt {
  id: string;
  score: number;
  totalMarks: number;
  submittedAt: string;
  quiz: {
    title: string;
    duration: number;
    totalMarks: number;
    course: { courseCode: string; courseName: string };
    _count: { questions: number };
  };
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const target = new Date(targetDate);
      target.setHours(23, 59, 59, 0);
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s left`);
      } else {
        setTimeLeft(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} left`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <span className="font-mono text-xs font-extrabold text-amber-800 dark:text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/40 shadow-xs">{timeLeft}</span>;
}

export default function TakeQuizPage() {
  const [quizzes, setQuizzes] = useState<QuizWithDetails[]>([]);
  const [myAttempts, setMyAttempts] = useState<MyQuizAttempt[]>([]);
  const [activeTab, setActiveTab] = useState<"quizzes" | "assignments">("quizzes");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<QuizView>("list");
  const [activeQuiz, setActiveQuiz] = useState<QuizWithDetails | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedCourseIds, setBlockedCourseIds] = useState<string[]>([]);
  const [completedAttempts, setCompletedAttempts] = useState<Record<string, { score: number; totalMarks: number }>>({});
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [deletingAttemptId, setDeletingAttemptId] = useState<string | null>(null);

  const handleDeleteAttempt = async (attemptId: string) => {
    setDeletingAttemptId(attemptId);
    try {
      await api.delete(`/api/quizzes/my-attempts/${attemptId}`);
      setMyAttempts((prev) => prev.filter((a) => a.id !== attemptId));
    } catch (err) {
      console.error("Failed to delete attempt record:", err);
    } finally {
      setDeletingAttemptId(null);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("completed_quiz_attempts");
      if (saved) {
        setCompletedAttempts(JSON.parse(saved));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchQuizzesData = useCallback(async () => {
    try {
      const [qRes, attRes] = await Promise.all([
        api.get<QuizWithDetails[]>("/api/quizzes?status=Published"),
        api.get<MyQuizAttempt[]>("/api/quizzes/my-attempts").catch(() => ({ data: [] })),
      ]);
      setQuizzes(qRes.data);
      setMyAttempts(Array.isArray(attRes.data) ? attRes.data : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.get("/api/me")
      .then((res) => {
        if (res.data?.student?.blocked) {
          setIsBlocked(true);
        }
      })
      .catch(() => {});

    api.get("/api/dashboard/student")
      .then((res) => {
        if (Array.isArray(res.data?.enrollments)) {
          const blockedIds = res.data.enrollments
            .filter((e: { blocked?: boolean; courseId: string }) => e.blocked)
            .map((e: { courseId: string }) => e.courseId);
          setBlockedCourseIds(blockedIds);
        }
      })
      .catch(() => {});

    fetchQuizzesData();
  }, [fetchQuizzesData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQuizzesData();
    setRefreshing(false);
  };

  const startQuiz = useCallback(async (quiz: QuizWithDetails) => {
    setStartingQuizId(quiz.id);
    try {
      const res = await api.get<QuizWithDetails>(`/api/quizzes/${quiz.id}`);
      const fullQuiz = res.data;
      setActiveQuiz(fullQuiz);
      setQuestions(fullQuiz.questions || []);
      setCurrentQ(0);
      setAnswers(new Array((fullQuiz.questions || []).length).fill(null));
      setTimeLeft(fullQuiz.duration * 60);
      setView("attempt");
    } catch {
      // silent fail
    } finally {
      setStartingQuizId(null);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (view !== "attempt" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [view, timeLeft]);

  useEffect(() => {
    if (view === "attempt" && timeLeft === 0 && activeQuiz) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, view]);

  const handleAnswer = (optionIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = optionIdx;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!activeQuiz || submittingQuiz) return;
    setSubmittingQuiz(true);
    try {
      const structuredAnswers = questions.map((q, i) => ({
        questionId: q.id,
        selectedOption: answers[i] ?? -1,
      }));

      const res = await api.post<{ score: number }>(`/api/quizzes/${activeQuiz.id}/submit`, {
        answers: structuredAnswers,
      });
      const achievedScore = res.data.score;
      setScore(achievedScore);
      setCompletedAttempts((prev) => {
        const next = { ...prev, [activeQuiz.id]: { score: achievedScore, totalMarks: activeQuiz.totalMarks } };
        try {
          localStorage.setItem("completed_quiz_attempts", JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      setView("result");
    } catch (err) {
      console.error("Failed to submit quiz:", err);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-muted animate-pulse border-2 border-border" />
          <div className="h-4 w-64 bg-muted animate-pulse border-2 border-border" />
        </div>
        <ListSkeleton count={3} />
      </div>
    );
  }

  // ─── LIST VIEW ───────────────────────────────────────────
  if (view === "list") {
    const onlineQuizzes = quizzes.filter(
      (q) => q.status === "Published" && !q.title.toLowerCase().includes("assignment") && !q.questions?.some((quest) => quest.type === "Short" || quest.type === "Long")
    );
    const hardformAssignments = quizzes.filter(
      (q) => q.status === "Published" && (q.title.toLowerCase().includes("assignment") || q.questions?.some((quest) => quest.type === "Short" || quest.type === "Long"))
    );

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
        <PageHeader
          title="Quizzes & Assignments"
          subtitle="Attempt online MCQ quizzes and track hardform assignment deadlines"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "My Quizzes" }]}
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

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3 flex-wrap">
          <button
            onClick={() => setActiveTab("quizzes")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "quizzes"
                ? "bg-brand-primary text-white shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Quizzes - Online MCQs ({onlineQuizzes.length})
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "assignments"
                ? "bg-brand-primary text-white shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Assignments - Hardform Submissions ({hardformAssignments.length})
          </button>
        </div>

        {isBlocked && (
          <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-4 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Your account is currently Struck Off due to attendance shortage. Quiz taking is restricted until Re-Admission is approved by Admin.
          </div>
        )}

        {activeTab === "quizzes" ? (
          /* Online MCQs Quizzes Tab */
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand-primary" /> Active Online Quizzes
              </h3>
              {onlineQuizzes.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-2xl">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30 text-purple-500" />
                  <p className="text-sm font-bold text-foreground">No online MCQ quizzes available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active online quizzes will appear here for you to attempt.
                  </p>
                </div>
              ) : (
                onlineQuizzes.map((quiz) => {
                  const daysLeft = Math.ceil((new Date(quiz.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isQuizBlocked = isBlocked || blockedCourseIds.includes(quiz.courseId);

                  return (
                    <motion.div
                      key={quiz.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-card p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
                        <FileText className="h-6 w-6 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-foreground">{quiz.title}</h3>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 px-2 bg-purple-500/10 text-purple-600 border-purple-500/30">
                            Online MCQ Quiz
                          </Badge>
                          {isQuizBlocked && (
                            <Badge variant="destructive" className="text-[10px] uppercase font-bold py-0 px-1.5">
                              Restricted: Struck Off
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {quiz.course?.courseCode} • {quiz.questions?.length || 0} questions • {quiz.duration} mins • {quiz.totalMarks} marks
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Due: {new Date(quiz.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {completedAttempts[quiz.id] ? (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1.5 font-bold">
                            Completed Score: {completedAttempts[quiz.id].score}/{quiz.totalMarks}
                          </Badge>
                        ) : new Date(quiz.dueDate).getTime() < Date.now() ? (
                          <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs px-3 py-1.5 font-bold">
                            Deadline Expired
                          </Badge>
                        ) : (
                          <>
                            <Badge
                              variant="secondary"
                              className={
                                daysLeft <= 2
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }
                            >
                              {daysLeft <= 0 ? "Due Today" : `${daysLeft}d left`}
                            </Badge>
                            <Button size="sm" onClick={() => startQuiz(quiz)} disabled={isQuizBlocked || startingQuizId === quiz.id} className="gap-1 min-w-[80px]">
                              {startingQuizId === quiz.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting…
                                </>
                              ) : (
                                <>
                                  Start <ArrowRight className="h-3.5 w-3.5" />
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Quiz Attempt History Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" /> Quiz Attempt History &amp; Scores
              </h3>

              {(() => {
                const quizAttempts = myAttempts.filter(
                  (att) => !att.quiz.title.toLowerCase().includes("assignment")
                );

                if (quizAttempts.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-2xl">
                      <p className="text-xs font-semibold text-muted-foreground">No quiz attempt history yet</p>
                    </div>
                  );
                }

                return quizAttempts.map((att) => {
                  const percentage = att.totalMarks > 0 ? Math.round((att.score / att.totalMarks) * 100) : 0;

                  return (
                    <motion.div
                      key={att.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4 hover:shadow-md transition-shadow"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[11px] font-bold border-brand-primary/30 text-brand-primary">
                            {att.quiz.course?.courseCode}
                          </Badge>
                          <h4 className="text-sm font-bold text-foreground">{att.quiz.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(att.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 font-bold">
                          Attempted ✓
                        </Badge>
                        <div className="text-right">
                          <p className="text-base font-extrabold text-foreground">{att.score} / {att.totalMarks}</p>
                          <p className="text-[10px] font-bold text-muted-foreground">{percentage}% Score</p>
                        </div>
                        <Badge className={percentage >= 50 ? "bg-emerald-500 text-white font-bold" : "bg-rose-500 text-white font-bold"}>
                          {percentage >= 50 ? "Passed" : "Needs Improvement"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deletingAttemptId === att.id}
                          onClick={() => handleDeleteAttempt(att.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete from history"
                        >
                          {deletingAttemptId === att.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          /* Hardform Assignments Tab */
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> Active Assignments
              </h3>

              {hardformAssignments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-2xl">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30 text-amber-500" />
                  <p className="text-sm font-bold text-foreground">No hardform assignments published</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assignments will be displayed here with submission deadlines.
                  </p>
                </div>
              ) : (
                hardformAssignments.map((quiz) => {
                  const daysLeft = Math.ceil((new Date(quiz.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isSubmitted = myAttempts.some(
                    (a) => a.quiz.title === quiz.title || (a.quiz.course?.courseCode === quiz.course?.courseCode && a.quiz.title === quiz.title)
                  );

                  return (
                    <motion.div
                      key={quiz.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl border p-5 flex items-center justify-between gap-4 transition-all ${
                        isSubmitted
                          ? "border-border/40 bg-muted/20 opacity-80"
                          : "border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 shadow-sm"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">{quiz.title}</h3>
                          {isSubmitted && (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-2 font-bold">
                              Marked / Done ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {quiz.course?.courseCode} — {quiz.course?.courseName}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1 mt-1">
                          <Clock className="h-3.5 w-3.5" />
                          Deadline: {new Date(quiz.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} till 11:59 PM
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {isSubmitted ? (
                          <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold px-3 py-1.5 text-xs rounded-xl border border-emerald-500/30">
                            Submitted ✓
                          </Badge>
                        ) : (
                          <>
                            <Badge
                              className={
                                daysLeft <= 2
                                  ? "bg-rose-600 text-white font-extrabold px-3 py-1.5 text-xs shadow-sm"
                                  : "bg-amber-600 text-white font-extrabold px-3 py-1.5 text-xs shadow-sm"
                              }
                            >
                              {daysLeft <= 0 ? "Due Today" : `${daysLeft} days remaining`}
                            </Badge>
                            <CountdownTimer targetDate={quiz.dueDate} />
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Assignment Submission History Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> Assignment Submission History
              </h3>

              {(() => {
                const assignmentAttempts = myAttempts.filter(
                  (att) => att.quiz.title.toLowerCase().includes("assignment")
                );

                if (assignmentAttempts.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-2xl">
                      <p className="text-xs font-semibold text-muted-foreground">No assignment submission history yet</p>
                    </div>
                  );
                }

                return assignmentAttempts.map((att) => (
                  <motion.div
                    key={att.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[11px] font-bold border-brand-primary/30 text-brand-primary">
                          {att.quiz.course?.courseCode}
                        </Badge>
                        <h4 className="text-sm font-bold text-foreground">{att.quiz.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(att.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold px-3 py-1 text-xs">
                        Submitted ✓
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={deletingAttemptId === att.id}
                        onClick={() => handleDeleteAttempt(att.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete from history"
                      >
                        {deletingAttemptId === att.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ));
              })()}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // ─── ATTEMPT VIEW ────────────────────────────────────────
  if (view === "attempt" && activeQuiz) {
    const q = questions[currentQ];
    const answeredCount = answers.filter((a) => a !== null).length;
    const isTimeLow = timeLeft <= 60;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* Quiz Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">{activeQuiz.title}</h2>
            <p className="text-sm text-muted-foreground">
              Question {currentQ + 1} of {questions.length} • {answeredCount}/{questions.length} answered
            </p>
          </div>
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2 border ${isTimeLow ? "border-rose-500/50 bg-rose-500/10" : "border-border bg-card"}`}>
            <Clock className={`h-5 w-5 ${isTimeLow ? "text-rose-500 animate-pulse" : "text-muted-foreground"}`} />
            <span className={`text-xl font-mono font-bold ${isTimeLow ? "text-rose-500" : "text-foreground"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Question Area */}
          <div className="lg:col-span-3 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <p className="text-base font-medium text-foreground mb-6">
                  <span className="text-brand-primary font-bold mr-2">Q{currentQ + 1}.</span>
                  {q?.text}
                </p>
                <div className="space-y-3">
                  {q?.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${answers[currentQ] === idx
                          ? "border-brand-primary bg-brand-primary/10 ring-1 ring-brand-primary/30"
                          : "border-border bg-card hover:border-brand-primary/30 hover:bg-accent/30"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${answers[currentQ] === idx
                              ? "border-brand-primary bg-brand-primary text-white"
                              : "border-muted-foreground/30 text-muted-foreground"
                            }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="text-sm text-foreground">{opt}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setCurrentQ((p) => Math.max(0, p - 1))} disabled={currentQ === 0}>
                Previous
              </Button>
              {currentQ < questions.length - 1 ? (
                <Button onClick={() => setCurrentQ((p) => p + 1)}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submittingQuiz} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
                  {submittingQuiz ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Submitting…
                    </>
                  ) : (
                    "Submit Quiz"
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Question Navigation Grid */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Questions</h3>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`h-10 w-10 rounded-lg text-xs font-bold transition-all ${i === currentQ
                      ? "bg-brand-primary text-white ring-2 ring-brand-primary/30"
                      : answers[i] !== null
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-brand-primary" /><span className="text-muted-foreground">Current</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500/30" /><span className="text-muted-foreground">Answered</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-muted" /><span className="text-muted-foreground">Not answered</span></div>
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <Button variant="outline" size="sm" className="w-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={handleSubmit}>
                <AlertCircle className="h-3.5 w-3.5 mr-1" /> End Quiz
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── RESULT VIEW ─────────────────────────────────────────
  if (view === "result" && activeQuiz) {
    const totalMarks = activeQuiz.totalMarks;
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const isPassing = percentage >= 50;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-6 mt-4 pb-12">
        <div className="rounded-3xl border-2 border-border bg-card p-8 text-center shadow-lg">
          <div className={`flex h-20 w-20 mx-auto items-center justify-center rounded-3xl ${isPassing ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500"}`}>
            <Trophy className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-foreground mt-4">{isPassing ? "Great Job! 🎉" : "Quiz Attempt Summary 💪"}</h2>
          <p className="text-sm font-semibold text-muted-foreground mt-1">{activeQuiz.title}</p>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-muted/40 p-4 border border-border">
              <p className="text-3xl font-black text-brand-primary">{score}</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Your Score</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4 border border-border">
              <p className="text-3xl font-black text-foreground">{totalMarks}</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Total Marks</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4 border border-border">
              <p className={`text-3xl font-black ${isPassing ? "text-emerald-500" : "text-rose-500"}`}>{percentage}%</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5 font-mono">Percentage</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button size="lg" className="rounded-xl font-bold px-8 bg-brand-primary hover:bg-brand-primary/90 text-white shadow-md" onClick={() => { setView("list"); setActiveQuiz(null); }}>
              Back to Quizzes Dashboard
            </Button>
          </div>
        </div>

        {/* Answer Key Review Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" /> Answer Key &amp; Question Review
            </h3>
            <Badge variant="outline" className="font-bold text-xs">
              {questions.length} Questions Reviewed
            </Badge>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const studentAnswer = answers[idx];

              const correctOptIdx =
                q.correctOption !== null && q.correctOption !== undefined
                  ? Number(q.correctOption)
                  : -1;

              const isCorrect =
                studentAnswer !== null &&
                studentAnswer !== undefined &&
                correctOptIdx >= 0 &&
                Number(studentAnswer) === correctOptIdx;

              const correctAnswerText =
                correctOptIdx >= 0 && q.options && q.options[correctOptIdx] !== undefined
                  ? q.options[correctOptIdx]
                  : "N/A";

              const studentAnswerText =
                studentAnswer !== null &&
                studentAnswer !== undefined &&
                studentAnswer >= 0 &&
                q.options &&
                q.options[studentAnswer] !== undefined
                  ? q.options[studentAnswer]
                  : "Not Answered";

              return (
                <div
                  key={q.id || idx}
                  className={`rounded-2xl border p-4 bg-card space-y-2.5 shadow-xs transition-all ${
                    isCorrect
                      ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                      : "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-foreground leading-snug">
                      <span className="text-brand-primary font-black mr-2">Q{idx + 1}.</span>
                      {q.text}
                    </p>
                    <Badge
                      className={`text-[10px] font-extrabold uppercase shrink-0 py-0.5 px-2 rounded-lg ${
                        isCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      {isCorrect ? "Correct ✓" : "Incorrect ✗"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-xl font-medium">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Correct Answer:</span>
                      <span className="font-semibold">{correctAnswerText}</span>
                    </div>

                    {!isCorrect && (
                      <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 px-3 py-1.5 rounded-xl font-medium">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400">Your Choice:</span>
                        <span className="font-semibold">{studentAnswerText}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
