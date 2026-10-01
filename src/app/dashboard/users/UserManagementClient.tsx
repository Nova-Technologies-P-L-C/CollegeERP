"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/axios";
import {
  Users2,
  Search,
  Shield,
  Check,
  X,
  AlertTriangle,
  Trash2,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AuditBadgeInline } from "@/components/dashboard/AuditBadge";
import { CardSkeleton, TableSkeleton } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

import { useProgramLevel } from "@/context/program-level-context";
import {
  getDisciplinesForLevel,
  getTermOptionsForLevel,
  formatTermLabel,
} from "@/lib/constants";

type Role = "ADMIN" | "FACULTY" | "STUDENT";

interface UserRow {
  id: string;
  clerkId: string | null;
  name: string | null;
  email: string;
  role: Role;
  createdAt: string;
  student: {
    rollNo: string;
    department: string;
    semester?: number;
    approvedBy?: string | null;
    enrollmentDate?: string;
  } | null;
  faculty: { department: string } | null;
}

const roleBadgeClass: Record<Role, string> = {
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  FACULTY:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  STUDENT:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function AvatarCircle({ name, role }: { name: string | null; role: Role }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const bg =
    role === "ADMIN"
      ? "bg-blue-500"
      : role === "FACULTY"
        ? "bg-emerald-500"
        : "bg-brand-primary";
  return (
    <div
      className={`h-9 w-9 shrink-0 rounded-full ${bg} flex items-center justify-center text-white text-xs font-bold`}
    >
      {initials}
    </div>
  );
}

export function UserManagementClient() {
  const { programLevel } = useProgramLevel();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"ALL" | Role>("ALL");
  const [filterDept, setFilterDept] = useState<string>("ALL");
  const [filterSem, setFilterSem] = useState<string>("ALL");
  
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setFilterDept("ALL");
    setFilterSem("ALL");
  }, [programLevel]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDeleteUser = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/users/${pendingDelete.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== pendingDelete.id));
      showToast(`User ${pendingDelete.name ?? pendingDelete.email} successfully deleted.`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      showToast(
        axiosErr.response?.data?.error ?? "Failed to delete user — please try again",
        false,
      );
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("programLevel", programLevel);
      if (filterRole !== "ALL") params.set("role", filterRole);
      if (filterDept !== "ALL") params.set("department", filterDept);
      if (filterSem !== "ALL") params.set("semester", filterSem);
      if (search) params.set("search", search);
      
      const res = await api.get<UserRow[]>(`/api/users?${params.toString()}`);
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterDept, filterSem, search, programLevel]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const facultyCount = users.filter((u) => u.role === "FACULTY").length;
  const studentCount = users.filter((u) => u.role === "STUDENT").length;

  const handleRoleChange = (selected: "ALL" | Role) => {
    setFilterRole(selected);
    if (selected === "ALL" || selected === "ADMIN") {
      setFilterDept("ALL");
      setFilterSem("ALL");
    } else if (selected === "FACULTY") {
      setFilterSem("ALL");
    }
  };

  const showDeptFilter = filterRole === "FACULTY" || filterRole === "STUDENT";
  const showSemFilter = filterRole === "STUDENT";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <PageHeader
        title="User Management"
        subtitle="View all registered users with clean search, role, department, and semester filters"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "User Management" },
        ]}
      />

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={users.length}
            trend="Matching criteria"
            trendDirection="up"
            icon={Users2}
            iconColor="#6366f1"
            iconBg="#6366f120"
          />
          <StatsCard
            title="Admins"
            value={adminCount}
            trend="System administrators"
            trendDirection="up"
            icon={Shield}
            iconColor="#3b82f6"
            iconBg="#3b82f620"
          />
          <StatsCard
            title="Faculty"
            value={facultyCount}
            trend="Teaching staff"
            trendDirection="up"
            icon={Shield}
            iconColor="#10b981"
            iconBg="#10b98120"
          />
          <StatsCard
            title="Students"
            value={studentCount}
            trend="Enrolled learners"
            trendDirection="up"
            icon={Users2}
            iconColor="#f59e0b"
            iconBg="#f59e0b20"
          />
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="user-search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>

        {/* Role Select */}
        <div className="w-full md:w-44">
          <Select
            value={filterRole}
            onValueChange={(v) => handleRoleChange(v as "ALL" | Role)}
          >
            <SelectTrigger id="role-filter" className="h-10 rounded-xl">
              <div className="flex items-center gap-2 truncate">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Roles" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="FACULTY">Faculty</SelectItem>
              <SelectItem value="STUDENT">Student</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Department Select (Shown for Faculty and Student roles) */}
        {showDeptFilter && (
          <div className="w-full md:w-52">
            <Select
              value={filterDept}
              onValueChange={(v) => setFilterDept(v)}
            >
              <SelectTrigger id="dept-filter" className="h-10 rounded-xl">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder={programLevel === "INTERMEDIATE" ? "All Disciplines" : "All Departments"} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{programLevel === "INTERMEDIATE" ? "All Disciplines" : "All Departments"}</SelectItem>
                {getDisciplinesForLevel(programLevel).map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Semester Select (Shown for Student role only) */}
        {showSemFilter && (
          <div className="w-full md:w-40">
            <Select
              value={filterSem}
              onValueChange={(v) => setFilterSem(v)}
            >
              <SelectTrigger id="sem-filter" className="h-10 rounded-xl">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder={programLevel === "INTERMEDIATE" ? "All Parts" : "All Semesters"} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{programLevel === "INTERMEDIATE" ? "All Parts" : "All Semesters"}</SelectItem>
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

      {/* User Table */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    User
                  </th>
                  <th className="text-center py-3 px-3 font-semibold text-foreground">
                    Role
                  </th>
                  <th className="text-left py-3 px-3 font-semibold text-foreground hidden md:table-cell">
                    Department & Semester / Roll
                  </th>
                  <th className="text-center py-3 px-3 font-semibold text-foreground hidden lg:table-cell">
                    Joined Date
                  </th>
                  <th className="text-center py-3 px-3 font-semibold text-foreground hidden md:table-cell">
                    Audit
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-16 text-muted-foreground"
                    >
                      <Users2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No users found</p>
                      <p className="text-xs mt-1">
                        Try adjusting your search or dropdown filters
                      </p>
                    </td>
                  </tr>
                ) : (
                  users.map((user, idx) => {
                    const deptName = user.student?.department ?? user.faculty?.department ?? "N/A";
                    const semVal = user.student?.semester ? `Sem ${user.student.semester}` : null;
                    const rollNo = user.student?.rollNo;

                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.25 }}
                        className="border-b border-border/50 hover:bg-accent/20 transition-colors"
                      >
                        {/* User info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <AvatarCircle name={user.name} role={user.role} />
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {user.name ?? "—"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role badge */}
                        <td className="text-center py-3 px-3">
                          <Badge
                            variant="secondary"
                            className={roleBadgeClass[user.role]}
                          >
                            {user.role}
                          </Badge>
                        </td>

                        {/* Department / Semester / Roll */}
                        <td className="py-3 px-3 text-xs text-muted-foreground hidden md:table-cell">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {deptName}
                            </span>
                            <span className="text-[11px]">
                              {[rollNo, semVal].filter(Boolean).join(" • ") || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Joined Date */}
                        <td className="text-center py-3 px-3 text-xs text-muted-foreground hidden lg:table-cell">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>

                        {/* Audit */}
                        <td className="text-center py-3 px-3 hidden md:table-cell">
                          <div className="flex flex-col items-center gap-1">
                            <AuditBadgeInline entity="User" entityId={user.id} />
                            {user.role === "STUDENT" && user.student && (
                              <div className="text-[10px] text-muted-foreground flex flex-col items-center">
                                <span className="font-semibold text-brand-primary">
                                  Approved by: {user.student.approvedBy || "Admin"}
                                </span>
                                <span className="text-[9px] opacity-75">
                                  {user.student.enrollmentDate
                                    ? new Date(user.student.enrollmentDate).toLocaleString(undefined, {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                      })
                                    : new Date(user.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            onClick={() => setPendingDelete(user)}
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deletion Dialog */}
      <Dialog
        open={!!pendingDelete}
        onOpenChange={() => setPendingDelete(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Confirm User Deletion
            </DialogTitle>
          </DialogHeader>

          {pendingDelete && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                <AvatarCircle
                  name={pendingDelete.name}
                  role={pendingDelete.role}
                />
                <div>
                  <p className="font-semibold text-foreground">
                    {pendingDelete.name ?? pendingDelete.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pendingDelete.email}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50">
                <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                  WARNING: This action is permanent. Deleting this user will immediately remove their account from Clerk, clear their Postgres record, and delete all associated student/faculty data.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-rose-600 text-white hover:bg-rose-700 rounded-xl gap-2"
            >
              {deleting ? (
                <>
                  <div className="h-4 w-4 animate-spin border-2 border-white/40 border-t-white rounded-full" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Delete Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl text-sm font-medium ${
              toast.ok
                ? "bg-emerald-600 text-white"
                : "bg-destructive text-destructive-foreground"
            }`}
          >
            {toast.ok ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <X className="h-4 w-4 shrink-0" />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
