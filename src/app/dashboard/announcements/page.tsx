"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/axios";
import { Plus, Bell, Trash2, Calendar, Target, Info, Loader2, RefreshCw } from "lucide-react";
import { AuditBadge } from "@/components/dashboard/AuditBadge";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ListSkeleton } from "@/components/ui";

import { useProgramLevel } from "@/context/program-level-context";
import {
  getDisciplinesForLevel,
  getTermOptionsForLevel,
  formatTermLabel,
} from "@/lib/constants";

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  audience: "All" | "Students" | "Faculty";
  priority: "Low" | "Medium" | "High";
  targetDepartment?: string | null;
  targetSemester?: number | null;
  programLevel?: "BS" | "INTERMEDIATE";
}

interface AnnouncementForm {
  title: string;
  content: string;
  audience: "All" | "Students" | "Faculty";
  priority: "Low" | "Medium" | "High";
  targetDepartment?: string;
  targetSemester?: string;
}

const audienceColors: Record<"All" | "Students" | "Faculty", string> = {
  All: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Students:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Faculty:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const emptyForm: AnnouncementForm = {
  title: "",
  content: "",
  audience: "All",
  priority: "Medium",
  targetDepartment: "",
  targetSemester: "",
};


export default function AnnouncementsPage() {
  const { programLevel } = useProgramLevel();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    api
      .get<Announcement[]>(`/api/announcements?programLevel=${programLevel}`)
      .then((r) => {
        setAnnouncements(Array.isArray(r.data) ? r.data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [programLevel]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const handleSave = async () => {
    if (!form.title || !form.content) return;
    setCreating(true);
    try {
      const payload = {
        title: form.title,
        content: form.content,
        audience: form.audience,
        priority: form.priority,
        programLevel,
        targetDepartment: form.audience !== "All" && form.targetDepartment ? form.targetDepartment : undefined,
        targetSemester: form.audience === "Students" && form.targetSemester ? Number(form.targetSemester) : undefined,
      };
      const { data: created } = await api.post<Announcement>(
        "/api/announcements",
        payload,
      );
      setAnnouncements((prev) => [created, ...prev]);
      setDialogOpen(false);
      setForm(emptyForm);
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/api/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      /* ignore */
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
          <div className="h-10 w-44 bg-muted animate-pulse border-2 border-border" />
        </div>
        <ListSkeleton count={4} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title="Announcements"
        subtitle="Post news and updates for students and faculty"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Announcements" },
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
              onClick={() => setDialogOpen(true)}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white h-9 px-4 rounded-xl flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> New Announcement
            </Button>
          </div>
        }
      />

      <div className="grid gap-6">
        <AnimatePresence mode="popLayout">
          {announcements.map((a, index) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className="group relative overflow-hidden bg-card border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="space-y-1 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`${audienceColors[a.audience]} text-[10px] uppercase tracking-wider font-bold`}
                      >
                        {a.audience}
                      </Badge>
                      <span className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(a.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-brand-primary transition-colors line-clamp-1">
                      {a.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId !== null}
                    className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete announcement"
                  >
                    {deletingId === a.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-destructive" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {a.content}
                </p>

                <div className="mt-6 pt-4 border-t border-dashed flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center">
                      <Target className="h-3 w-3 mr-1 text-brand-secondary" />{" "}
                      Targeting: {a.audience}
                      {(a.targetDepartment || a.targetSemester) && (
                        <span className="ml-1 text-brand-secondary/80">
                          ({[a.targetDepartment, a.targetSemester ? `Semester ${a.targetSemester}` : null].filter(Boolean).join(" • ")})
                        </span>
                      )}
                    </span>
                    <span className="flex items-center">
                      <Info className="h-3 w-3 mr-1 text-brand-primary" />{" "}
                      {a.priority} Priority
                    </span>
                  </div>
                  <AuditBadge entity="Announcement" entityId={a.id} />
                </div>
              </div>

              {/* Decorative accent */}
              <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary opacity-50 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </AnimatePresence>

        {announcements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card/30 border-2 border-dashed rounded-3xl">
            <div className="h-16 w-16 bg-accent rounded-full flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No announcements yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-1">
              Click the &quot;New Announcement&quot; button to broadcast
              important updates.
            </p>
          </div>
        )}
      </div>

      {/* New Announcement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!creating) setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-[600px] border-none shadow-2xl overflow-hidden rounded-3xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-brand-primary via-brand-secondary to-brand-primary" />
          <DialogHeader className="pt-6">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-brand-primary" />
              Create Announcement
            </DialogTitle>
            <DialogDescription>
              Write a clear title and description. Choose your target audience.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6 px-1">
            <div className="grid gap-2">
              <Label
                htmlFor="title"
                className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
              >
                Announcement Title
              </Label>
              <Input
                id="title"
                disabled={creating}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Midterm Exam Schedule Released"
                className="h-12 text-lg font-medium ring-brand-primary focus-visible:ring-2 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Target Audience
                </Label>
                <Select
                  value={form.audience}
                  disabled={creating}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      audience: v as "All" | "Students" | "Faculty",
                    })
                  }
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Who is this for?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Everyone</SelectItem>
                    <SelectItem value="Students">Students Only</SelectItem>
                    <SelectItem value="Faculty">Faculty Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Priority
                </Label>
                <Select
                  value={form.priority}
                  disabled={creating}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      priority: v as "Low" | "Medium" | "High",
                    })
                  }
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.audience !== "All" && (
              <div className="grid grid-cols-2 gap-4">
                <div className={`grid gap-2 ${form.audience === "Students" ? "col-span-2 md:col-span-1" : "col-span-2"}`}>
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {programLevel === "INTERMEDIATE" ? "Target Discipline" : "Target Department"}
                  </Label>
                  <Select
                    value={form.targetDepartment || "all"}
                    disabled={creating}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        targetDepartment: v === "all" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder={programLevel === "INTERMEDIATE" ? "All Disciplines" : "All Departments"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{programLevel === "INTERMEDIATE" ? "All Disciplines" : "All Departments"}</SelectItem>
                      {getDisciplinesForLevel(programLevel).map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.audience === "Students" && (
                  <div className="grid gap-2 col-span-2 md:col-span-1">
                    <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      {programLevel === "INTERMEDIATE" ? "Target Part" : "Target Semester"}
                    </Label>
                    <Select
                      value={form.targetSemester || "all"}
                      disabled={creating}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          targetSemester: v === "all" ? "" : v,
                        })
                      }
                    >
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder={programLevel === "INTERMEDIATE" ? "All Parts" : "All Semesters"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{programLevel === "INTERMEDIATE" ? "All Parts" : "All Semesters"}</SelectItem>
                        {getTermOptionsForLevel(programLevel).map((sem) => (
                          <SelectItem key={sem} value={String(sem)}>
                            {formatTermLabel(programLevel, sem)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label
                htmlFor="content"
                className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
              >
                Message Content
              </Label>
              <Textarea
                id="content"
                disabled={creating}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Detailed information goes here..."
                className="min-h-[150px] resize-none ring-brand-primary focus-visible:ring-2 rounded-3xl p-6"
              />
            </div>
          </div>

          <DialogFooter className="pb-6">
            <Button
              variant="ghost"
              disabled={creating}
              onClick={() => setDialogOpen(false)}
              className="rounded-xl h-12 px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={creating || !form.title || !form.content}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl h-12 px-8 shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {creating ? "Posting..." : "Post Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
