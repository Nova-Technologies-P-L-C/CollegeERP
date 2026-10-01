"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/axios";
import { Pencil, Trash2, Eye, RefreshCw, BadgeCheck, Briefcase, Building2, Calendar, Shield, User } from "lucide-react";
import { AuditBadgeInline } from "@/components/dashboard/AuditBadge";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { DEPARTMENTS } from "@/lib/constants";
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
import { TableSkeleton } from "@/components/ui";
import { motion } from "framer-motion";

interface FacultyWithUser {
  id: string;
  userId: string;
  phone: string | null;
  department: string;
  specialization: string | null;
  joinDate: string;
  avatar: string | null;
  user: { name: string | null; email: string };
  teaches?: { id: string; courseCode: string; courseName: string }[];
}

interface FacultyForm {
  phone: string;
  department: string;
  specialization: string;
}

const deptColors: Record<string, string> = {
  "Computer Science":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Mathematics:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Physics:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  English:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Chemistry: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  Economics: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Political Science": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Zoology: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  Urdu: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "Islamic Studies":
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

const emptyForm: FacultyForm = {
  phone: "",
  department: "",
  specialization: "",
};

export default function ManageFacultyPage() {
  const [faculty, setFaculty] = useState<FacultyWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyWithUser | null>(
    null,
  );
  const [deletingFaculty, setDeletingFaculty] =
    useState<FacultyWithUser | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [viewingFaculty, setViewingFaculty] = useState<FacultyWithUser | null>(null);
  const [form, setForm] = useState<FacultyForm>(emptyForm);
  const [filterDept, setFilterDept] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    api.get<FacultyWithUser[]>("/api/faculty")
      .then((fRes) => {
        setFaculty(Array.isArray(fRes.data) ? fRes.data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const filtered =
    filterDept === "all"
      ? faculty
      : faculty.filter((f) => f.department === filterDept);

  const openEdit = (f: FacultyWithUser) => {
    setEditingFaculty(f);
    setForm({
      phone: f.phone ?? "",
      department: f.department,
      specialization: f.specialization ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingFaculty || !form.department) return;
    setSaving(true);
    try {
      const { data: updated } = await api.patch<FacultyWithUser>(
        `/api/faculty/${editingFaculty.id}`,
        form,
      );
      setFaculty((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f)),
      );
      setDialogOpen(false);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFaculty) return;
    setSaving(true);
    try {
      await api.delete(`/api/faculty/${deletingFaculty.id}`);
      setFaculty((prev) => prev.filter((f) => f.id !== deletingFaculty.id));
      setDeleteDialogOpen(false);
      setDeletingFaculty(null);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<FacultyWithUser>[] = [
    {
      key: "user",
      header: "Name",
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-secondary/10 text-xs font-bold text-brand-secondary">
            {(row.user.name ?? "?")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <p className="font-medium text-foreground">
              {row.user.name ?? "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      render: (row) => (
        <Badge variant="secondary" className={deptColors[row.department] || ""}>
          {row.department}
        </Badge>
      ),
    },
    {
      key: "teaches",
      header: "Assigned Subjects",
      sortable: false,
      render: (row) =>
        row.teaches && row.teaches.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {row.teaches.map((c) => (
              <Badge
                key={c.id}
                variant="outline"
                className="text-[10px] bg-brand-primary/5 border-brand-primary/20 text-brand-primary font-mono font-semibold"
              >
                {c.courseCode}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">No subjects assigned</span>
        ),
    },
    {
      key: "specialization",
      header: "Specialization",
      sortable: false,
      render: (row) => <span>{row.specialization ?? "—"}</span>,
    },
    {
      key: "joinDate",
      header: "Joined",
      sortable: true,
      render: (row) => (
        <span className="text-muted-foreground">
          {new Date(row.joinDate).toLocaleDateString("en-PK", {
            year: "numeric",
            month: "short",
          })}
        </span>
      ),
    },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setViewingFaculty(row);
              setDetailsDialogOpen(true);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => openEdit(row)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
            title="Edit Faculty"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => {
              setDeletingFaculty(row);
              setDeleteDialogOpen(true);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors"
            title="Delete Faculty"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse border-2 border-border" />
            <div className="h-4 w-64 bg-muted animate-pulse border-2 border-border" />
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse border-2 border-border" />
        </div>
        <TableSkeleton rows={8} />
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
        title="Manage Faculty"
        subtitle={`${faculty.length} faculty members across all departments`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Manage Faculty" },
        ]}
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="flex items-center gap-2 border-2 border-border bg-card shadow-[2px_2px_0px_0px_var(--border)] cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--border)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_var(--border)] transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <DataTable
        data={filtered as unknown as Record<string, unknown>[]}
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        searchPlaceholder="Search by name, email, or specialization..."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Faculty</DialogTitle>
            <DialogDescription>
              Update the faculty information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0321-1234567"
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) => setForm({ ...form, department: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Specialization</Label>
              <Input
                value={form.specialization}
                onChange={(e) =>
                  setForm({ ...form, specialization: e.target.value })
                }
                placeholder="Machine Learning"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white min-w-[140px]"
            >
              {saving ? "Saving..." : "Update Faculty"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Faculty</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingFaculty?.user.name}</strong>? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={saving} onClick={handleDelete} className="min-w-[100px]">
              {saving ? "Deleting..." : <><Trash2 className="h-4 w-4 mr-2" /> Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Faculty Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-[640px] p-0 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Faculty Member Profile</DialogTitle>
            <DialogDescription>
              Detailed information about the selected faculty profile.
            </DialogDescription>
          </DialogHeader>
          {viewingFaculty && (
            <div className="grid grid-cols-1 md:grid-cols-12 rounded-3xl overflow-hidden border border-border">
              {/* Left Column: Columnar Picture + Profile/Academic Details */}
              <div className="md:col-span-5 bg-gradient-to-br from-[#A78BFA] to-brand-primary p-6 text-center flex flex-col justify-between items-center text-white space-y-4">
                <div className="w-full flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border backdrop-blur-sm bg-white/20 text-white border-white/20">
                    ✓ Faculty Instructor
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] text-white font-semibold">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified
                  </div>
                </div>

                <div className="flex flex-col items-center text-center w-full py-1">
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mx-auto flex items-center justify-center mb-2 border-2 border-white/30 overflow-hidden ring-4 ring-white/10 shadow-lg shrink-0">
                    {viewingFaculty.avatar ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={viewingFaculty.avatar}
                        alt={viewingFaculty.user.name ?? "Avatar"}
                        className="object-cover h-full w-full"
                      />
                    ) : (
                      <User className="w-10 h-10 text-white" />
                    )}
                  </div>

                  <h2 className="text-xl font-black text-white mb-0.5 leading-snug">
                    {viewingFaculty.user.name}
                  </h2>

                  <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-0.5 text-[11px] text-white font-bold">
                    <Briefcase className="w-3.5 h-3.5" /> Faculty
                  </span>
                </div>

                {/* Profile & Academic Stack */}
                <div className="w-full space-y-2 pt-3 border-t border-white/20 text-left text-xs text-white/90">
                  <div>
                    <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Department</p>
                    <p className="font-semibold text-white truncate">{viewingFaculty.department}</p>
                  </div>
                  {viewingFaculty.specialization && (
                    <div>
                      <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Specialization</p>
                      <p className="font-semibold text-white truncate">{viewingFaculty.specialization}</p>
                    </div>
                  )}
                  {viewingFaculty.phone && (
                    <div>
                      <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Phone</p>
                      <p className="font-semibold text-white">{viewingFaculty.phone}</p>
                    </div>
                  )}
                  {viewingFaculty.user.email && (
                    <div>
                      <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Email</p>
                      <p className="font-semibold text-white font-mono truncate">{viewingFaculty.user.email}</p>
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

                  {/* Joined Date */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-brand-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Joined Date</p>
                      <p className="font-semibold text-foreground">
                        {new Date(viewingFaculty.joinDate).toLocaleDateString("en-PK", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* System Audit */}
                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-brand-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">System Audit Details</p>
                      <div className="mt-0.5">
                        <AuditBadgeInline entity="Faculty" entityId={viewingFaculty.id} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Verified Faculty Record
                  </p>
                  <Button
                    onClick={() => setDetailsDialogOpen(false)}
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
    </motion.div>
  );
}

