"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, Send, MessageSquare, CheckCircle, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "@/lib/axios";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CourseOption {
  id: string;
  courseCode: string;
  courseName: string;
}

interface FacultyOption {
  id: string;
  user: { name: string | null };
  department: string;
}

interface PastFeedback {
  id: string;
  type: "Faculty" | "Course";
  targetId: string;
  targetName?: string;
  rating: number;
  comment: string;
  date: string;
}

export default function SubmitFeedbackPage() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [pastFeedback, setPastFeedback] = useState<PastFeedback[]>([]);
  const [feedbackType, setFeedbackType] = useState<"Faculty" | "Course">("Faculty");
  const [targetId, setTargetId] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const fetchFeedbackData = useCallback(async () => {
    try {
      const [crsRes, facRes, fbRes, meRes] = await Promise.all([
        api.get<CourseOption[]>("/api/courses"),
        api.get<FacultyOption[]>("/api/faculty"),
        api.get<PastFeedback[]>("/api/feedback"),
        api.get("/api/me").catch(() => ({ data: null })),
      ]);
      setCourses(crsRes.data);
      setFacultyList(facRes.data);
      setPastFeedback(fbRes.data);
      if (meRes.data?.student?.blocked) {
        setIsBlocked(true);
      }
    } catch (err) {
      console.error("Error loading feedback lists:", err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    setInitialLoading(true);
    fetchFeedbackData();
  }, [fetchFeedbackData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFeedbackData();
    setRefreshing(false);
  };

  const handleSubmit = async () => {
    if (!targetId || rating === 0) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await api.post<PastFeedback>("/api/feedback", {
        type: feedbackType,
        targetId,
        rating,
        comment,
      });
      const newFeedback = res.data;
      setPastFeedback((prev) => [newFeedback, ...prev]);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setTargetId("");
        setRating(0);
        setComment("");
      }, 3000);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setErrorMsg(axiosErr.response?.data?.error ?? "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = () => (
    <div>
      <label className="text-sm font-medium text-foreground mb-2 block">Rating</label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="p-0.5 transition-transform hover:scale-110 cursor-pointer"
          >
            <Star
              className={`h-8 w-8 transition-colors ${star <= (hoverRating || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
                }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm font-medium text-foreground">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
          </span>
        )}
      </div>
    </div>
  );

  const SubmitButton = () => (
    <div className="space-y-3">
      {errorMsg && (
        <div className="p-3 rounded-lg border border-rose-500/25 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs font-bold leading-normal">
          ⚠️ {errorMsg}
        </div>
      )}
      {submitted ? (
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Feedback submitted successfully!</span>
        </div>
      ) : (
        <Button
          onClick={handleSubmit}
          disabled={!targetId || rating === 0 || submitting || isBlocked}
          className="w-full gap-2 cursor-pointer font-bold border-2 border-border shadow-[2px_2px_0px_0px_var(--border)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--border)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_var(--border)] transition-all disabled:opacity-40"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isBlocked ? "Restricted: Struck Off" : submitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <PageHeader
        title="Submit Feedback"
        subtitle="Share your thoughts about courses and faculty"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Feedback" }]}
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

      {initialLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border-2 border-border rounded-xl shadow-[4px_4px_0px_0px_var(--border)] max-w-2xl mx-auto">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-3" />
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            Loading feedback details...
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-4">
          {isBlocked && (
            <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-4 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Your account is currently Struck Off due to attendance shortage. Feedback submission is restricted.
            </div>
          )}
          <Tabs value={feedbackType} onValueChange={(v) => { setFeedbackType(v as "Faculty" | "Course"); setTargetId(""); setRating(0); setErrorMsg(""); }}>
          <TabsList className="w-full">
            <TabsTrigger value="Faculty" className="flex-1">Faculty Feedback</TabsTrigger>
            <TabsTrigger value="Course" className="flex-1">Course Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="Faculty" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Select Faculty</label>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a faculty member" />
                  </SelectTrigger>
                  <SelectContent>
                    {facultyList.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.user.name} — {f.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <StarRating />
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Comment (optional)</label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience..." rows={4} />
              </div>
              <SubmitButton />
            </div>
          </TabsContent>

          <TabsContent value="Course" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Select Course</label>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.courseCode} — {c.courseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <StarRating />
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Comment (optional)</label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience..." rows={4} />
              </div>
              <SubmitButton />
            </div>
          </TabsContent>
        </Tabs>

        {/* Previously submitted feedback */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Recent Feedback</h3>
          </div>
          {pastFeedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
          ) : (
            <div className="space-y-4">
              {pastFeedback.slice(0, 5).map((f) => (
                <div key={f.id} className="flex flex-col gap-2 rounded-lg p-4 bg-accent/20 border border-border/30">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-xs text-foreground truncate">
                      {f.targetName || `Target ID: ${f.targetId.slice(0, 8)}...`}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 uppercase font-bold tracking-wider">{f.type}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${s <= f.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {f.comment || "No comment provided."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    </motion.div>
  );
}

