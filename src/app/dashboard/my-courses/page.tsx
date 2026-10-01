"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/axios";
import {
  BookOpen,
  Users,
  GraduationCap,
  RefreshCw,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GridSkeleton } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CourseWithDetails {
  id: string;
  courseCode: string;
  courseName: string;
  creditHours: number;
  department: string;
  semester: number;
  assignedFaculty: string | null;
  assignedFacultyMorning?: string | null;
  assignedFacultyEvening?: string | null;
  shift?: string;
  faculty: { user: { name: string | null; email?: string | null }; department: string } | null;
  _count: { enrollments: number };
}

const COURSE_COLORS = [
  "from-blue-500/10 to-indigo-500/10 border-blue-500/20",
  "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
  "from-purple-500/10 to-violet-500/10 border-purple-500/20",
  "from-amber-500/10 to-orange-500/10 border-amber-500/20",
  "from-rose-500/10 to-pink-500/10 border-rose-500/20",
  "from-cyan-500/10 to-sky-500/10 border-cyan-500/20",
];

const ICON_COLORS = [
  "var(--color-brand-primary)",
  "var(--color-system-success)",
  "var(--color-data-3)",
  "var(--color-data-4)",
  "var(--color-system-danger)",
  "var(--color-brand-secondary)",
];

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacultyModal, setSelectedFacultyModal] = useState<CourseWithDetails | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      const r = await api.get<CourseWithDetails[]>("/api/courses");
      setCourses(Array.isArray(r.data) ? r.data : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCourses();
    setRefreshing(false);
  };

  const filteredCourses = courses.filter((c) => {
    if (!searchQuery.trim()) return true;
    const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const combined = `${c.courseName} ${c.courseCode} ${c.department} ${(c as unknown as Record<string, unknown>).facultyName ?? ""}`.toLowerCase();
    return tokens.every((token) => combined.includes(token));
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-muted animate-pulse border-2 border-border" />
          <div className="h-4 w-64 bg-muted animate-pulse border-2 border-border" />
        </div>
        <GridSkeleton count={6} />
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
        title="My Courses & Learning Hub"
        subtitle="Explore your registered subjects, faculty details, and quick portal shortcuts"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "My Courses" },
        ]}
        action={
          <div className="flex items-center gap-2">
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
          </div>
        }
      />

      {/* Top Search, Shift Filters & Stats Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course name or code..."
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          </div>

        <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto justify-end">
          <Badge variant="outline" className="px-3 py-1.5 rounded-xl border-brand-primary/30 text-brand-primary font-bold text-xs">
            {filteredCourses.length} Courses
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            {filteredCourses.reduce((acc, c) => acc + c.creditHours, 0)} Total Credits
          </Badge>
        </div>
      </div>

      {/* Interactive Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCourses.map((course, idx) => {
          const facultyName = course.faculty?.user?.name ?? "TBA";
          const studentCount = course._count.enrollments;

          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`group relative rounded-3xl border-2 border-border/70 bg-gradient-to-br ${COURSE_COLORS[idx % COURSE_COLORS.length]} p-6 shadow-sm hover:shadow-xl hover:shadow-brand-primary/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/20 shadow-sm shrink-0"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${ICON_COLORS[idx % ICON_COLORS.length]} 20%, transparent)`,
                    }}
                  >
                    <BookOpen
                      className="h-6 w-6 transition-transform duration-300 group-hover:scale-110"
                      style={{ color: ICON_COLORS[idx % ICON_COLORS.length] }}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant="secondary"
                      className="text-xs font-black font-mono border border-border/80 bg-card/90 px-2.5 py-0.5 shadow-xs"
                    >
                      {course.courseCode}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-bold bg-card/70 border-border/60 py-0.5 px-2">
                      Sem {course.semester} • {course.creditHours} CH
                    </Badge>
                  </div>
                </div>

                {/* Title & Department */}
                <div className="space-y-1.5 mb-4">
                  <h3 className="text-lg font-bold text-foreground leading-snug group-hover:text-brand-primary transition-colors line-clamp-2">
                    {course.courseName}
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Department of {course.department}
                  </p>
                </div>

                {/* Metadata Row */}
                <div className="space-y-2.5 text-xs border-t border-border/40 pt-4 mb-4">
                  <div
                    onClick={() => setSelectedFacultyModal(course)}
                    className="flex items-center justify-between px-1 text-muted-foreground font-medium hover:bg-brand-primary/5 p-1 rounded-lg cursor-pointer transition-colors group/inst"
                    title="Click to view instructor details"
                  >
                    <span className="flex items-center gap-1.5 font-semibold text-foreground group-hover/inst:text-brand-primary transition-colors">
                      <GraduationCap className="h-4 w-4 text-brand-primary shrink-0" /> Instructor
                    </span>
                    <span className="font-bold text-brand-primary underline decoration-dotted underline-offset-2">{facultyName}</span>
                  </div>

                  <div className="flex items-center justify-between px-1 text-muted-foreground font-medium">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-brand-secondary" /> Classmates Enrolled
                    </span>
                    <span className="font-bold text-foreground font-mono">{studentCount} Students</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-16 px-6 text-muted-foreground bg-card border border-border rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto border border-brand-primary/20">
            <BookOpen className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No subjects assigned yet</h3>
          <p className="text-sm max-w-md mx-auto text-muted-foreground leading-relaxed">
            {searchQuery.trim()
              ? "No courses match your search query. Try clearing the search filter."
              : "No subjects assigned yet. Please contact your campus administrator to get courses assigned to your account."}
          </p>
        </div>
      )}

      {/* Faculty Instructor Info Modal */}
      <Dialog open={!!selectedFacultyModal} onOpenChange={(open) => { if (!open) setSelectedFacultyModal(null); }}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-brand-primary" />
              Faculty Instructor Details
            </DialogTitle>
          </DialogHeader>

          {selectedFacultyModal && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 space-y-1">
                <span className="text-xs font-mono font-bold text-brand-primary uppercase tracking-wider">Assigned Instructor</span>
                <h3 className="text-xl font-black text-foreground">
                  {selectedFacultyModal.faculty?.user?.name || "TBA / Unassigned"}
                </h3>
                <p className="text-xs text-muted-foreground font-semibold">
                  Department of {selectedFacultyModal.faculty?.department || selectedFacultyModal.department}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold">Course Code & Name:</span>
                  <span className="font-bold text-foreground">{selectedFacultyModal.courseCode} — {selectedFacultyModal.courseName}</span>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold">Office Hours / Contact:</span>
                  <span className="font-mono text-brand-primary font-bold">Contact via Faculty Desk</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFacultyModal(null)} className="rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
