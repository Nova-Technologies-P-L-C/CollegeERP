"use client";

import { useState, useEffect } from "react";
import { BookOpen, Plus, Pencil, Trash2, Loader2, HelpCircle, FileSpreadsheet, Upload, FileText, ChevronDown, RefreshCw } from "lucide-react";
import { api } from "@/lib/axios";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { motion } from "framer-motion";
import { ListSkeleton } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

interface CourseItem {
  id: string;
  courseCode: string;
  courseName: string;
}

interface QuestionItem {
  id: string;
  courseId: string;
  text: string;
  type: "MCQ" | "Short" | "Long";
  marks: number;
  options?: string[];
  correctOption?: number;
  sampleAnswer?: string;
  course?: CourseItem;
}

const typeBadgeColors: Record<string, string> = {
  MCQ: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  Short: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  Long: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
};

export default function QuestionBankPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // CSV Bulk Upload state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvCourseId, setCsvCourseId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Form states
  const [formCourseId, setFormCourseId] = useState("");
  const [formType, setFormType] = useState<"MCQ" | "Short" | "Long">("MCQ");
  const [formText, setFormText] = useState("");
  const [formMarks, setFormMarks] = useState(1);
  const [formOptions, setFormOptions] = useState(["", "", "", ""]);
  const [formCorrect, setFormCorrect] = useState(0);
  const [formSampleAnswer, setFormSampleAnswer] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<CourseItem[]>("/api/courses"),
      api.get<QuestionItem[]>("/api/questions"),
    ])
      .then(([coursesRes, qsRes]) => {
        setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
        setQuestions(Array.isArray(qsRes.data) ? qsRes.data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load question bank data:", err);
        setLoading(false);
      });
  }, []);

  const openAddModal = () => {
    setEditingQuestion(null);
    setFormCourseId(courses[0]?.id || "");
    setFormType("MCQ");
    setFormText("");
    setFormMarks(1);
    setFormOptions(["", "", "", ""]);
    setFormCorrect(0);
    setFormSampleAnswer("");
    setErrorMsg(null);
    setShowModal(true);
  };

  const openCsvModal = () => {
    setCsvCourseId("");
    setCsvText("");
    setCsvError(null);
    setShowCsvModal(true);
  };

  const handleCsvImport = async () => {
    if (!csvCourseId || !csvText.trim()) return;
    setImportingCsv(true);
    setCsvError(null);
    try {
      const parseCsvLine = (textLine: string): string[] => {
        const result: string[] = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < textLine.length; i++) {
          const char = textLine[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(cur.trim().replace(/^["']|["']$/g, ""));
            cur = "";
          } else {
            cur += char;
          }
        }
        result.push(cur.trim().replace(/^["']|["']$/g, ""));
        return result;
      };

      const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
      const parsedItems = [];

      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        const lowerLine = line.toLowerCase();
        // Skip header row if it contains question/option/type header labels
        if (idx === 0 && (lowerLine.includes("question") || lowerLine.includes("option a") || lowerLine.includes("correct answer") || lowerLine.startsWith("type"))) {
          continue;
        }

        const parts = parseCsvLine(line);
        if (parts.length < 5) continue;

        let qText = "";
        let marks = 1;
        let optionA = "";
        let optionB = "";
        let optionC = "";
        let optionD = "";
        let rawAnswer = "";

        if (parts[0].toUpperCase() === "MCQ" || parts[0].toUpperCase() === "SHORT" || parts[0].toUpperCase() === "LONG") {
          // 8-column format: Type, Question, Marks, Option A, Option B, Option C, Option D, Correct Answer
          if (parts[0].toUpperCase() !== "MCQ") {
            setCsvError(`Row ${idx + 1} (${parts[0]}) skipped: Bulk CSV import is for MCQ questions only.`);
            continue;
          }
          qText = parts[1] || "";
          marks = Number(parts[2]) || 1;
          optionA = parts[3] || "";
          optionB = parts[4] || "";
          optionC = parts[5] || "";
          optionD = parts[6] || "";
          rawAnswer = parts[7] || "0";
        } else {
          // Standard 6-column production format: Question, Option A, Option B, Option C, Option D, Correct Answer
          qText = parts[0] || "";
          optionA = parts[1] || "";
          optionB = parts[2] || "";
          optionC = parts[3] || "";
          optionD = parts[4] || "";
          rawAnswer = parts[5] || "A";
          marks = 1;
        }

        if (!qText || !optionA || !optionB) continue;

        // Parse correct answer (supports "A", "B", "C", "D", "0", "1", "2", "3", "Option A", etc.)
        let correctIdx = 0;
        const normalizedAns = rawAnswer.trim().toUpperCase();
        if (normalizedAns === "A" || normalizedAns === "OPTION A" || normalizedAns === "0") {
          correctIdx = 0;
        } else if (normalizedAns === "B" || normalizedAns === "OPTION B" || normalizedAns === "1") {
          correctIdx = 1;
        } else if (normalizedAns === "C" || normalizedAns === "OPTION C" || normalizedAns === "2") {
          correctIdx = 2;
        } else if (normalizedAns === "D" || normalizedAns === "OPTION D" || normalizedAns === "3") {
          correctIdx = 3;
        } else {
          correctIdx = Number(normalizedAns) || 0;
        }

        parsedItems.push({
          courseId: csvCourseId,
          type: "MCQ" as const,
          text: qText,
          marks,
          options: [optionA, optionB, optionC, optionD],
          correctOption: Math.min(3, Math.max(0, correctIdx)),
        });
      }

      if (parsedItems.length === 0) {
        setCsvError("No valid MCQ question rows found. Please ensure CSV matches standard format: Question, Option A, Option B, Option C, Option D, Correct Answer.");
        setImportingCsv(false);
        return;
      }

      const res = await api.post<QuestionItem[]>("/api/questions", parsedItems);
      const createdList = Array.isArray(res.data) ? res.data : [res.data];
      setQuestions((prev) => [...createdList, ...prev]);
      setShowCsvModal(false);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      setCsvError(apiErr.response?.data?.error || "Failed to import CSV questions");
    } finally {
      setImportingCsv(false);
    }
  };

  const openEditModal = (q: QuestionItem) => {
    setEditingQuestion(q);
    setFormCourseId(q.courseId);
    setFormType(q.type);
    setFormText(q.text);
    setFormMarks(q.marks || 1);
    setFormOptions(q.options && q.options.length > 0 ? [...q.options] : ["", "", "", ""]);
    setFormCorrect(q.correctOption ?? 0);
    setFormSampleAnswer(q.sampleAnswer ?? "");
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formText.trim() || !formCourseId) return;
    if (formType === "MCQ" && formOptions.some((o) => !o.trim())) {
      setErrorMsg("Please fill in all 4 option choices for MCQs");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = {
        courseId: formCourseId,
        type: formType,
        text: formText,
        marks: Number(formMarks),
        options: formType === "MCQ" ? formOptions : [],
        correctOption: formType === "MCQ" ? formCorrect : null,
        sampleAnswer: formType !== "MCQ" ? formSampleAnswer : null,
      };

      if (editingQuestion) {
        const res = await api.patch<QuestionItem>(`/api/questions/${editingQuestion.id}`, payload);
        const updated = res.data;
        setQuestions((prev) => prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)));
      } else {
        const res = await api.post<QuestionItem>("/api/questions", payload);
        const created = res.data;
        setQuestions((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } }; message?: string };
      setErrorMsg(apiErr.response?.data?.error || apiErr.message || "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (qId: string) => {
    setDeletingId(qId);
    try {
      await api.delete(`/api/questions/${qId}`);
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
    } catch {
      // silent fail
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse border-2 border-border" />
            <div className="h-4 w-72 bg-muted animate-pulse border-2 border-border" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-[200px] bg-muted animate-pulse border-2 border-border" />
            <div className="h-10 w-36 bg-muted animate-pulse border-2 border-border" />
          </div>
        </div>
        <ListSkeleton count={5} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <PageHeader
        title="Question Bank"
        subtitle="Create reusable question pools (MCQs, Short & Long questions) for your assigned courses"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Question Bank" }]}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                Promise.all([
                  api.get<CourseItem[]>("/api/courses"),
                  api.get<QuestionItem[]>("/api/questions"),
                ])
                  .then(([coursesRes, qsRes]) => {
                    setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
                    setQuestions(Array.isArray(qsRes.data) ? qsRes.data : []);
                    setLoading(false);
                  })
                  .catch(() => setLoading(false));
              }}
              className="gap-2 rounded-xl border-2"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>

            <Button variant="outline" onClick={openCsvModal} className="gap-2 rounded-xl border-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Bulk CSV
            </Button>

            <Button onClick={openAddModal} className="gap-2 bg-brand-primary text-white rounded-xl shadow-md">
              <Plus className="h-4 w-4" /> Add Question
            </Button>
          </div>
        }
      />

      {/* Main Data Section: 2 Primary Categories (MCQs & Questions) with Course Expansion */}
      <div className="space-y-6">
        {[
          { key: "MCQ", title: "MCQs", icon: HelpCircle, items: questions.filter((q) => q.type === "MCQ") },
          { key: "Questions", title: "Questions", icon: FileText, items: questions.filter((q) => q.type !== "MCQ") },
        ].map((category) => {
          const CategoryIcon = category.icon;
          const courseMap = new Map<string, QuestionItem[]>();
          category.items.forEach((q) => {
            const list = courseMap.get(q.courseId) || [];
            list.push(q);
            courseMap.set(q.courseId, list);
          });

          return (
            <div key={category.key} className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
              <div className="p-5 bg-muted/20 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{category.title}</h2>
                    <p className="text-xs text-muted-foreground">{category.items.length} Total items</p>
                  </div>
                </div>
                <Badge variant="secondary" className="font-bold text-xs">
                  {courseMap.size} Courses
                </Badge>
              </div>

              <div className="p-4 space-y-3">
                {courseMap.size === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No {category.title.toLowerCase()} created yet.
                  </p>
                ) : (
                  Array.from(courseMap.entries()).map(([courseId, courseQuestions]) => {
                    const courseObj = courses.find((c) => c.id === courseId);
                    return (
                      <details key={courseId} className="group rounded-2xl border border-border/50 bg-accent/10 overflow-hidden">
                        <summary className="p-4 flex items-center justify-between cursor-pointer font-bold text-sm text-foreground hover:bg-accent/30 transition-colors select-none">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-brand-primary" />
                            <span>
                              {courseObj ? `${courseObj.courseCode} — ${courseObj.courseName}` : "Course Questions"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-[11px] font-semibold border-brand-primary/20 text-brand-primary">
                              {courseQuestions.length} {category.title}
                            </Badge>
                            <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                          </div>
                        </summary>

                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-background/50">
                          {courseQuestions.map((q) => (
                            <div key={q.id} className="rounded-xl bg-card p-4 space-y-2.5 shadow-2xs hover:shadow-xs transition-shadow border border-border/40">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className={`${typeBadgeColors[q.type]} text-[10px] font-bold`}>
                                      {q.type === "MCQ" ? "MCQ" : "Question"}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px]">
                                      {q.marks} {q.marks === 1 ? "Mark" : "Marks"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm font-semibold text-foreground mt-1">{q.text}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(q)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 disabled:opacity-50" onClick={() => handleDelete(q.id)} disabled={deletingId === q.id}>
                                    {deletingId === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" /> : <Trash2 className="h-3.5 w-3.5" />}
                                  </Button>
                                </div>
                              </div>

                              {q.type === "MCQ" && q.options && q.options.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {q.options.map((opt, oIdx) => (
                                    <div
                                      key={oIdx}
                                      className={`w-fit max-w-full px-2.5 py-1 rounded-lg text-xs font-medium ${
                                        oIdx === q.correctOption
                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20"
                                          : "bg-muted/40 text-muted-foreground border border-transparent"
                                      }`}
                                    >
                                      <span className="opacity-70 mr-1">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-brand-primary" />
              {editingQuestion ? "Edit Question" : "Add Question to Bank"}
            </DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400 font-medium">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Course</Label>
                <Select value={formCourseId} onValueChange={setFormCourseId}>
                  <SelectTrigger className="h-11 rounded-xl w-full">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.courseCode} - {c.courseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Question Type</Label>
                <Select value={formType === "MCQ" ? "MCQ" : "Short"} onValueChange={(v) => {
                  const t = v as "MCQ" | "Short";
                  setFormType(t);
                  if (t === "Short" && formMarks === 1) setFormMarks(2);
                }}>
                  <SelectTrigger className="h-11 rounded-xl w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">MCQ</SelectItem>
                    <SelectItem value="Short">Question</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Question Text</Label>
                <Textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Enter question wording..."
                  className="rounded-xl"
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Marks</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formMarks}
                  onChange={(e) => setFormMarks(Number(e.target.value))}
                  className="h-11 rounded-xl font-mono text-center font-bold"
                />
              </div>
            </div>

            {/* MCQ Options */}
            {formType === "MCQ" && (
              <div className="space-y-2 pt-1">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block">
                  Options (Click letter to set as correct answer)
                </Label>
                {formOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormCorrect(i)}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 text-xs font-bold transition-all ${
                        formCorrect === i
                          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                          : "border-muted text-muted-foreground hover:border-emerald-500/50"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </button>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...formOptions];
                        newOpts[i] = e.target.value;
                        setFormOptions(newOpts);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="h-10 rounded-xl"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formText.trim() || saving}
              className="bg-brand-primary text-white hover:opacity-90 rounded-xl gap-2 min-w-[100px]"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : editingQuestion ? "Update" : "Save Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Bulk Import Modal */}
      <Dialog open={showCsvModal} onOpenChange={setShowCsvModal}>
        <DialogContent className="max-w-xl w-full rounded-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Bulk Question Import (CSV / Excel)
            </DialogTitle>
          </DialogHeader>

          {csvError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400 font-medium break-words">
              {csvError}
            </div>
          )}

          <div className="space-y-4 py-2 w-full overflow-hidden">
            <div className="space-y-1.5 w-full">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Target Subject / Course</Label>
              <Select value={csvCourseId} onValueChange={setCsvCourseId}>
                <SelectTrigger className="h-11 rounded-xl w-full">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.courseCode} - {c.courseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CSV Data (Paste Rows below or upload)</Label>
              <div className="relative w-full">
                <Textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`Question,Option A,Option B,Option C,Option D,Correct Answer\n"What is a programming language?","A set of rules for writing programs","A computer hardware","An operating system","A database","A"`}
                  className="rounded-xl font-mono text-xs h-40 max-h-48 overflow-y-auto resize-none w-full max-w-full break-all"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-muted-foreground space-y-1 w-full overflow-hidden break-words">
              <p className="font-bold text-purple-600 dark:text-purple-400">💡 Standard MCQ CSV Format:</p>
              <p className="break-all">• Header: <code>Question,Option A,Option B,Option C,Option D,Correct Answer</code></p>
              <p className="break-all">• Example: <code>&quot;What is 2+2?&quot;,&quot;2&quot;,&quot;3&quot;,&quot;4&quot;,&quot;5&quot;,&quot;C&quot;</code></p>
              <p className="text-[10px] text-muted-foreground italic">Note: Correct Answer accepts &quot;A&quot;, &quot;B&quot;, &quot;C&quot;, or &quot;D&quot;.</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCsvModal(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleCsvImport}
              disabled={!csvText.trim() || !csvCourseId || importingCsv}
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl gap-2 min-w-[120px]"
            >
              {importingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importingCsv ? "Importing..." : "Import Questions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
