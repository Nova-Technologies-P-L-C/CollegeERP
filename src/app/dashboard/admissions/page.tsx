"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import { CheckCircle, XCircle, Clock, Eye, Trash2, Upload, Users, Shield, RefreshCw, CheckSquare, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { AuditBadgeInline } from "@/components/dashboard/AuditBadge";
import { useProgramLevel } from "@/context/program-level-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { motion, AnimatePresence } from "framer-motion";
import { TableSkeleton, Spinner } from "@/components/ui";

interface Admission {
  id: string;
  studentName: string;
  email: string;
  phone: string;
  appliedDepartment: string;
  applicationDate: string;
  status: "Pending" | "Approved" | "Rejected";
  fatherName: string | null;
  cnic: string | null;
  previousInstitution: string | null;
  marksObtained: number;
  totalMarks: number;
  shift?: string;
  semester?: number;
  selectedCourses?: string[];
}

interface StaffRequest {
  id: string;
  name: string;
  email: string;
  role: "FACULTY" | "ADMIN";
  phone: string | null;
  department: string | null;
  specialization: string | null;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

const statusColors: Record<"Pending" | "Approved" | "Rejected", string> = {
  Pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

const statusIcons: Record<"Pending" | "Approved" | "Rejected", LucideIcon> = {
  Pending: Clock,
  Approved: CheckCircle,
  Rejected: XCircle,
};

interface CourseItem {
  id: string;
  courseCode: string;
  courseName: string;
}

type BulkAction = "Approve" | "Reject" | "Delete";

export default function ManageAdmissionsPage() {
  const router = useRouter();
  const { programLevel } = useProgramLevel();
  const [activeTab, setActiveTab] = useState<"students" | "faculty" | "admins">("students");
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [staffRequests, setStaffRequests] = useState<StaffRequest[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(
    null,
  );
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedStaffRequest, setSelectedStaffRequest] = useState<StaffRequest | null>(null);
  const [viewStaffDialogOpen, setViewStaffDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("Pending");
  const [importing, setImporting] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittingStatus, setSubmittingStatus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- Bulk selection state ---
  const [selectedAdmissionIds, setSelectedAdmissionIds] = useState<Set<string>>(new Set());
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    api.get<CourseItem[]>("/api/courses")
      .then((r) => setCourses(r.data || []))
      .catch((err) => console.error("Error loading courses in admissions:", err));
  }, []);

  // Reset selections when tab, filter, or programLevel changes
  useEffect(() => {
    setSelectedAdmissionIds(new Set());
    setSelectedStaffIds(new Set());
  }, [activeTab, filterStatus, programLevel]);

  const loadAdmissions = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("programLevel", programLevel);
    if (filterStatus !== "all") {
      params.set("status", filterStatus);
    }
    api
      .get<Admission[]>(`/api/admissions?${params.toString()}`)
      .then((r) => setAdmissions(Array.isArray(r.data) ? r.data : []))
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error ?? "Failed to load admissions");
        setAdmissions([]);
      })
      .finally(() => setLoading(false));
  }, [filterStatus, programLevel]);

  const loadStaffRequests = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("programLevel", programLevel);
    if (filterStatus !== "all") {
      params.set("status", filterStatus);
    }
    api
      .get<StaffRequest[]>(`/api/onboarding?${params.toString()}`)
      .then((r) => setStaffRequests(Array.isArray(r.data) ? r.data : []))
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error ?? "Failed to load staff requests");
        setStaffRequests([]);
      })
      .finally(() => setLoading(false));
  }, [filterStatus, programLevel]);

  const handleRefresh = useCallback(() => {
    if (activeTab === "students") {
      loadAdmissions();
    } else {
      loadStaffRequests();
    }
  }, [activeTab, loadAdmissions, loadStaffRequests]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const handleStatusChange = async (
    id: string,
    newStatus: "Pending" | "Approved" | "Rejected",
  ) => {
    setMutationError(null);
    if (newStatus === "Approved") {
      setMutationError(
        "Cannot approve student admission before payment verification. The Accountant must verify payment with a valid receipt number and amount at the Accountant Desk."
      );
      return;
    }
    setSubmittingId(id);
    setSubmittingStatus(newStatus);
    try {
      await api.patch(`/api/admissions/${id}`, { status: newStatus });
      setAdmissions((prev) =>
        filterStatus === "all"
          ? prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
          : prev.filter((a) => a.id !== id)
      );
      if (selectedAdmission?.id === id) {
        setSelectedAdmission({ ...selectedAdmission, status: newStatus });
      }
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setMutationError(
        axiosErr.response?.data?.error ?? "Failed to update admission status",
      );
    } finally {
      setSubmittingId(null);
      setSubmittingStatus(null);
    }
  };

  const handleStaffStatusChange = async (
    id: string,
    newStatus: "Approved" | "Rejected",
  ) => {
    setMutationError(null);
    setSubmittingId(id);
    setSubmittingStatus(newStatus);
    try {
      await api.patch(`/api/onboarding/approve`, { requestId: id, status: newStatus });
      setStaffRequests((prev) =>
        filterStatus === "all"
          ? prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
          : prev.filter((r) => r.id !== id)
      );
      setSuccessMessage(`Staff request successfully ${newStatus.toLowerCase()}!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setMutationError(
        axiosErr.response?.data?.error ?? "Failed to update onboarding request status",
      );
    } finally {
      setSubmittingId(null);
      setSubmittingStatus(null);
    }
  };

  const handleDelete = async (id: string) => {
    setMutationError(null);
    setDeletingId(id);
    try {
      await api.delete(`/api/admissions/${id}`);
      setAdmissions((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setMutationError(
        axiosErr.response?.data?.error ?? "Failed to delete admission",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMutationError(null);
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admissions/import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "CSV import failed");
      }
      const result = (await res.json()) as { imported: number };
      setSuccessMessage(`Successfully imported ${result.imported} admission(s) from CSV`);
      setTimeout(() => setSuccessMessage(null), 5000);
      loadAdmissions();
      router.refresh();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "CSV import failed");
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  // ── Bulk selection helpers ─────────────────────────────────────────────────

  const visibleAdmissionIds = admissions.map((a) => a.id);
  const visibleStaffIds =
    activeTab === "faculty"
      ? staffRequests.filter((r) => r.role === "FACULTY").map((r) => r.id)
      : staffRequests.filter((r) => r.role === "ADMIN").map((r) => r.id);

  const currentSelectedIds = activeTab === "students" ? selectedAdmissionIds : selectedStaffIds;
  const currentVisible = activeTab === "students" ? visibleAdmissionIds : visibleStaffIds;

  const allSelected = currentVisible.length > 0 && currentVisible.every((id) => currentSelectedIds.has(id));
  const someSelected = currentVisible.some((id) => currentSelectedIds.has(id));

  const toggleSelectAll = () => {
    if (activeTab === "students") {
      if (allSelected) {
        setSelectedAdmissionIds(new Set());
      } else {
        setSelectedAdmissionIds(new Set(visibleAdmissionIds));
      }
    } else {
      if (allSelected) {
        setSelectedStaffIds(new Set());
      } else {
        setSelectedStaffIds(new Set(visibleStaffIds));
      }
    }
  };

  const toggleSelect = (id: string) => {
    if (activeTab === "students") {
      setSelectedAdmissionIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      setSelectedStaffIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }
  };

  const openBulkConfirm = (action: BulkAction) => {
    setBulkAction(action);
    setBulkConfirmOpen(true);
  };

  const executeBulkAction = async () => {
    if (!bulkAction) return;
    setBulkProcessing(true);
    setMutationError(null);
    let successCount = 0;
    let failCount = 0;

    try {
      if (activeTab === "students") {
        const ids = Array.from(selectedAdmissionIds);
        if (bulkAction === "Approve") {
          setMutationError(
            "Student admissions cannot be approved in bulk before payment verification. Each student must have their fee verified with an official receipt at the Accountant Desk."
          );
          setBulkProcessing(false);
          setBulkConfirmOpen(false);
          return;
        }
        for (const id of ids) {
          try {
            if (bulkAction === "Reject") {
              await api.patch(`/api/admissions/${id}`, { status: "Rejected" });
            } else if (bulkAction === "Delete") {
              await api.delete(`/api/admissions/${id}`);
            }
            successCount++;
          } catch {
            failCount++;
          }
        }
        loadAdmissions();
        setSelectedAdmissionIds(new Set());
      } else {
        // Staff requests (Faculty or Admin tabs)
        const ids = Array.from(selectedStaffIds);
        for (const id of ids) {
          try {
            if (bulkAction === "Approve") {
              await api.patch(`/api/onboarding/approve`, { requestId: id, status: "Approved" });
            } else if (bulkAction === "Reject") {
              await api.patch(`/api/onboarding/approve`, { requestId: id, status: "Rejected" });
            }
            // Note: Delete not available for staff requests (no delete API)
            successCount++;
          } catch {
            failCount++;
          }
        }
        loadStaffRequests();
        setSelectedStaffIds(new Set());
      }

      const label = bulkAction === "Approve" ? "approved" : bulkAction === "Reject" ? "rejected" : "deleted";
      if (failCount === 0) {
        setSuccessMessage(`✅ Bulk ${label}: ${successCount} item(s) processed successfully.`);
      } else {
        setSuccessMessage(`⚠️ Bulk ${label}: ${successCount} succeeded, ${failCount} failed.`);
      }
      setTimeout(() => setSuccessMessage(null), 6000);
      router.refresh();
    } finally {
      setBulkProcessing(false);
      setBulkConfirmOpen(false);
      setBulkAction(null);
    }
  };

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: Column<Admission>[] = [
    {
      key: "__select__",
      header: (
        <Checkbox
          checked={allSelected}
          data-state={someSelected && !allSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all"
          className="translate-y-[1px]"
        />
      ),
      render: (row) => (
        <Checkbox
          checked={selectedAdmissionIds.has(row.id)}
          onCheckedChange={() => toggleSelect(row.id)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          aria-label={`Select ${row.studentName}`}
          className="translate-y-[1px]"
        />
      ),
    },
    {
      key: "studentName",
      header: "Applicant",
      sortable: true,
      render: (row) => (
        <p className="font-medium text-foreground">{row.studentName}</p>
      ),
    },
    { key: "appliedDepartment", header: "Department", sortable: true },
    {
      key: "applicationDate",
      header: "Date",
      sortable: true,
      render: (row) => (
        <span className="text-muted-foreground">
          {new Date(row.applicationDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => {
        const Icon = statusIcons[row.status];
        return (
          <Badge
            variant="secondary"
            className={`flex w-fit items-center gap-1 ${statusColors[row.status]}`}
          >
            <Icon className="h-3 w-3" />
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedAdmission(row);
              setViewDialogOpen(true);
            }}
            disabled={submittingId !== null || deletingId !== null || importing}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="View Details"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
          </button>
          {row.status === "Pending" && (
            <>
              <button
                onClick={() => router.push("/dashboard/accountant")}
                disabled={submittingId !== null || deletingId !== null || importing}
                className="flex h-8 px-2 items-center gap-1 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 transition-colors shadow-2xs"
                title="Awaiting fee clearance. Verify payment at Accountant Desk."
              >
                <CreditCard className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Verify Fee</span>
              </button>
              <button
                onClick={() => handleStatusChange(row.id, "Rejected")}
                disabled={submittingId !== null || deletingId !== null || importing}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Reject"
              >
                {submittingId === row.id && submittingStatus === "Rejected" ? (
                  <Spinner size="sm" variant="secondary" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600" />
                )}
              </button>
            </>
          )}
          {row.status !== "Approved" && (
            <button
              onClick={() => handleDelete(row.id)}
              disabled={submittingId !== null || deletingId !== null || importing}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Delete"
            >
              {deletingId === row.id ? (
                <Spinner size="sm" variant="secondary" />
              ) : (
                <Trash2 className="h-4 w-4 text-rose-500" />
              )}
            </button>
          )}
        </div>
      ),
    },
  ];

  const staffColumns: Column<StaffRequest>[] = [
    {
      key: "__select__",
      header: (
        <Checkbox
          checked={allSelected}
          data-state={someSelected && !allSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all"
          className="translate-y-[1px]"
        />
      ),
      render: (row) => (
        <Checkbox
          checked={selectedStaffIds.has(row.id)}
          onCheckedChange={() => toggleSelect(row.id)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          aria-label={`Select ${row.name}`}
          className="translate-y-[1px]"
        />
      ),
    },
    {
      key: "name",
      header: "Applicant",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Requested Role",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`capitalize gap-1 ${
              row.role === "ADMIN"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            }`}
          >
            {row.role === "ADMIN" ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
            {row.role.toLowerCase()}
          </Badge>
          {row.department && (
            <Badge variant="outline" className="border-border text-xs">
              {row.department}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => {
        const Icon = statusIcons[row.status];
        return (
          <Badge
            variant="secondary"
            className={`flex w-fit items-center gap-1 ${statusColors[row.status]}`}
          >
            <Icon className="h-3 w-3" />
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSelectedStaffRequest(row);
              setViewStaffDialogOpen(true);
            }}
            disabled={submittingId !== null || deletingId !== null || importing}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="View Details"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
          </button>
          {row.status === "Pending" && (
            <>
              <button
                onClick={() => handleStaffStatusChange(row.id, "Approved")}
                disabled={submittingId !== null}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                title="Approve"
              >
                {submittingId === row.id && submittingStatus === "Approved" ? (
                  <Spinner size="sm" variant="primary" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                )}
              </button>
              <button
                onClick={() => handleStaffStatusChange(row.id, "Rejected")}
                disabled={submittingId !== null}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                title="Reject"
              >
                {submittingId === row.id && submittingStatus === "Rejected" ? (
                  <Spinner size="sm" variant="secondary" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600" />
                )}
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const selectedCount = activeTab === "students" ? selectedAdmissionIds.size : selectedStaffIds.size;

  // For the confirmation dialog label
  const bulkActionLabel =
    bulkAction === "Approve" ? "approve" : bulkAction === "Reject" ? "reject" : "delete";

  const bulkTargetLabel =
    activeTab === "students"
      ? `${selectedCount} student admission${selectedCount !== 1 ? "s" : ""}`
      : `${selectedCount} staff request${selectedCount !== 1 ? "s" : ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title="Manage Admissions & Requests"
        subtitle={
          activeTab === "students"
            ? `${admissions.filter((a) => a.status === "Pending").length} pending student admissions require review`
            : activeTab === "faculty"
            ? `${staffRequests.filter((r) => r.status === "Pending" && r.role === "FACULTY").length} pending faculty onboarding requests require review`
            : `${staffRequests.filter((r) => r.status === "Pending" && r.role === "ADMIN").length} pending admin onboarding requests require review`
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admissions & Requests" },
        ]}
        action={
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 shadow-[2px_2px_0px_0px_var(--border)] cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--border)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_var(--border)] transition-all shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {activeTab === "students" && (
              <>
                <input
                  type="file"
                  accept=".csv"
                  ref={csvInputRef}
                  onChange={handleCSVImport}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={importing || loading}
                  onClick={() => csvInputRef.current?.click()}
                  className="max-w-full truncate shrink-0"
                >
                  {importing ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {importing ? "Importing..." : "Import CSV"}
                </Button>
              </>
            )}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("students")}
          className={`pb-3 px-6 font-bold text-sm border-b-2 transition-all relative ${
            activeTab === "students"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Student Admissions
          {admissions.filter((a) => a.status === "Pending").length > 0 && (
            <span className="ml-2 bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
              {admissions.filter((a) => a.status === "Pending").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("faculty")}
          className={`pb-3 px-6 font-bold text-sm border-b-2 transition-all relative ${
            activeTab === "faculty"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Faculty Onboarding
          {staffRequests.filter((r) => r.status === "Pending" && r.role === "FACULTY").length > 0 && (
            <span className="ml-2 bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs animate-pulse">
              {staffRequests.filter((r) => r.status === "Pending" && r.role === "FACULTY").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("admins")}
          className={`pb-3 px-6 font-bold text-sm border-b-2 transition-all relative ${
            activeTab === "admins"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Admin Onboarding
          {staffRequests.filter((r) => r.status === "Pending" && r.role === "ADMIN").length > 0 && (
            <span className="ml-2 bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs animate-pulse">
              {staffRequests.filter((r) => r.status === "Pending" && r.role === "ADMIN").length}
            </span>
          )}
        </button>
      </div>

      {error ? (
        <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          <p className="text-sm font-medium">
            Failed to load data: {error}
          </p>
          <Button variant="outline" onClick={activeTab === "students" ? loadAdmissions : loadStaffRequests} className="w-fit">
            Retry
          </Button>
        </div>
      ) : loading ? (
        <TableSkeleton rows={10} />
      ) : activeTab === "students" ? (
        <DataTable
          data={admissions as unknown as Record<string, unknown>[]}
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          searchPlaceholder="Search applicants..."
        />
      ) : activeTab === "faculty" ? (
        <DataTable
          data={staffRequests.filter((r) => r.role === "FACULTY") as unknown as Record<string, unknown>[]}
          columns={staffColumns as unknown as Column<Record<string, unknown>>[]}
          searchPlaceholder="Search faculty requests..."
        />
      ) : (
        <DataTable
          data={staffRequests.filter((r) => r.role === "ADMIN") as unknown as Record<string, unknown>[]}
          columns={staffColumns as unknown as Column<Record<string, unknown>>[]}
          searchPlaceholder="Search admin requests..."
        />
      )}

      {mutationError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300 mt-4">
          {mutationError}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300 mt-4 font-semibold">
          {successMessage}
        </div>
      )}

      {/* ── Floating Bulk Action Bar ─────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            key="bulk-bar"
            initial={{ y: 80, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl px-5 py-3"
          >
            {/* Selection info */}
            <div className="flex items-center gap-2 pr-3 border-r border-border">
              <CheckSquare className="h-4 w-4 text-brand-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                {selectedCount} selected
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {activeTab !== "students" ? (
                <Button
                  size="sm"
                  onClick={() => openBulkConfirm("Approve")}
                  disabled={bulkProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs font-semibold gap-1.5"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve All
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => router.push("/dashboard/accountant")}
                  className="bg-amber-600 hover:bg-amber-700 text-white h-8 px-3 text-xs font-semibold gap-1.5"
                  title="Fee clearance at Accountant Desk is required before admission approval"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Clear at Accountant Desk
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => openBulkConfirm("Reject")}
                disabled={bulkProcessing}
                className="h-8 px-3 text-xs font-semibold gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject All
              </Button>
              {activeTab === "students" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openBulkConfirm("Delete")}
                  disabled={bulkProcessing}
                  className="h-8 px-3 text-xs font-semibold gap-1.5 border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete All
                </Button>
              )}
            </div>

            {/* Deselect */}
            <button
              onClick={() => {
                setSelectedAdmissionIds(new Set());
                setSelectedStaffIds(new Set());
              }}
              className="ml-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk Confirm Dialog ──────────────────────────────────────────── */}
      <Dialog open={bulkConfirmOpen} onOpenChange={(open) => { if (!bulkProcessing) setBulkConfirmOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">
              Bulk {bulkActionLabel} — {selectedCount} item{selectedCount !== 1 ? "s" : ""}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === "Delete"
                ? `This will permanently delete ${bulkTargetLabel}. This action cannot be undone.`
                : `This will ${bulkActionLabel} ${bulkTargetLabel}. Are you sure you want to proceed?`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setBulkConfirmOpen(false)}
              disabled={bulkProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={executeBulkAction}
              disabled={bulkProcessing}
              className={
                bulkAction === "Approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : bulkAction === "Reject"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-rose-700 hover:bg-rose-800 text-white"
              }
            >
              {bulkProcessing ? (
                <>
                  <Spinner size="sm" variant="white" className="mr-2" />
                  Processing…
                </>
              ) : (
                <>
                  {bulkAction === "Approve" && <CheckCircle className="h-4 w-4 mr-2" />}
                  {bulkAction === "Reject" && <XCircle className="h-4 w-4 mr-2" />}
                  {bulkAction === "Delete" && <Trash2 className="h-4 w-4 mr-2" />}
                  Confirm {bulkAction}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog (Students only) */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => { if (submittingId === null) setViewDialogOpen(open); }}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Reviewing admission request for {selectedAdmission?.studentName}
            </DialogDescription>
          </DialogHeader>

          {selectedAdmission && (
            <div className="grid gap-5 py-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Applicant Name
                  </p>
                  <p className="text-sm font-semibold">{selectedAdmission.studentName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Email Address
                  </p>
                  <p className="text-sm font-mono">{selectedAdmission.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Phone Number
                  </p>
                  <p className="text-sm">{selectedAdmission.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Father&apos;s Name
                  </p>
                  <p className="text-sm">{selectedAdmission.fatherName || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    National ID (Fayda)
                  </p>
                  <p className="text-sm font-mono">{selectedAdmission.cnic || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Department
                  </p>
                  <p className="text-sm">{selectedAdmission.appliedDepartment}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Shift & Semester
                  </p>
                  <p className="text-sm">
                    {selectedAdmission.shift || "Morning"} • Semester {selectedAdmission.semester || 1}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Applied On
                  </p>
                  <p className="text-sm font-mono">
                    {new Date(selectedAdmission.applicationDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Previous Institution
                  </p>
                  <p className="text-sm">{selectedAdmission.previousInstitution || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Marks Obtained
                  </p>
                  <p className="text-sm font-semibold">
                    {selectedAdmission.marksObtained} / {selectedAdmission.totalMarks}
                    {selectedAdmission.totalMarks > 0 && (
                      <span className="text-xs font-normal text-muted-foreground ml-1.5">
                        ({((selectedAdmission.marksObtained / selectedAdmission.totalMarks) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </p>
                </div>

                <div className="space-y-1 col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Selected Courses
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {courses.filter(c => selectedAdmission.selectedCourses?.includes(c.id)).length > 0 ? (
                      courses
                        .filter(c => selectedAdmission.selectedCourses?.includes(c.id))
                        .map(c => (
                          <Badge key={c.id} variant="outline" className="bg-violet-50/50 dark:bg-violet-950/10 border-violet-200 dark:border-violet-800">
                            {c.courseCode} - {c.courseName}
                          </Badge>
                        ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No courses selected or mapping unavailable</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-lg bg-accent/50 border flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Current Status
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={statusColors[selectedAdmission.status]}>
                      {selectedAdmission.status === "Pending" ? "Awaiting Payment Verification" : selectedAdmission.status}
                    </Badge>
                  </div>
                </div>
                <AuditBadgeInline entity="Admission" entityId={selectedAdmission.id} />
              </div>

              {selectedAdmission.status === "Pending" && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold">Awaiting Accountant Payment Clearance</p>
                    <p className="text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                      Admissions cannot be approved before payment verification. The Accountant must clear payment with an official transaction receipt number at the Accountant Desk before student enrollment is finalized.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-start">
            {selectedAdmission?.status === "Pending" ? (
              <>
                <Button
                  onClick={() => {
                    setViewDialogOpen(false);
                    router.push("/dashboard/accountant");
                  }}
                  className="bg-brand-primary hover:bg-brand-primary/90 text-white flex-1 min-w-[150px]"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Clear at Accountant Desk
                </Button>
                <Button
                  onClick={() =>
                    handleStatusChange(selectedAdmission.id, "Rejected")
                  }
                  variant="destructive"
                  disabled={submittingId !== null}
                  className="flex-1 min-w-[110px]"
                >
                  {submittingId === selectedAdmission.id && submittingStatus === "Rejected" ? (
                    <Spinner size="sm" variant="white" className="mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => setViewDialogOpen(false)}
                className="w-full"
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog (Staff only) */}
      <Dialog open={viewStaffDialogOpen} onOpenChange={(open) => { if (submittingId === null) setViewStaffDialogOpen(open); }}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Staff Request Details</DialogTitle>
            <DialogDescription>
              Reviewing onboarding request for {selectedStaffRequest?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedStaffRequest && (
            <div className="grid gap-5 py-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Applicant Name
                  </p>
                  <p className="text-sm font-semibold">{selectedStaffRequest.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Email Address
                  </p>
                  <p className="text-sm font-mono">{selectedStaffRequest.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Requested Role
                  </p>
                  <p className="text-sm font-semibold capitalize">{selectedStaffRequest.role.toLowerCase()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Phone Number
                  </p>
                  <p className="text-sm">{selectedStaffRequest.phone || "—"}</p>
                </div>
                {selectedStaffRequest.role === "FACULTY" && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Department
                    </p>
                    <p className="text-sm">{selectedStaffRequest.department || "—"}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    {selectedStaffRequest.role === "FACULTY" ? "Specialization" : "Designation"}
                  </p>
                  <p className="text-sm">{selectedStaffRequest.specialization || "—"}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Applied On
                  </p>
                  <p className="text-sm font-mono">
                    {new Date(selectedStaffRequest.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-lg bg-accent/50 border">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Current Status
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={statusColors[selectedStaffRequest.status]}>
                    {selectedStaffRequest.status}
                  </Badge>
                  {selectedStaffRequest.status === "Pending" && (
                    <span className="text-xs text-muted-foreground italic">
                      (Needs review)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-start">
            {selectedStaffRequest?.status === "Pending" ? (
              <>
                <Button
                  onClick={async () => {
                    await handleStaffStatusChange(selectedStaffRequest.id, "Approved");
                    setViewStaffDialogOpen(false);
                  }}
                  disabled={submittingId !== null}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 min-w-[120px]"
                >
                  {submittingId === selectedStaffRequest.id && submittingStatus === "Approved" ? (
                    <Spinner size="sm" variant="white" className="mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
                <Button
                  onClick={async () => {
                    await handleStaffStatusChange(selectedStaffRequest.id, "Rejected");
                    setViewStaffDialogOpen(false);
                  }}
                  variant="destructive"
                  disabled={submittingId !== null}
                  className="flex-1 min-w-[110px]"
                >
                  {submittingId === selectedStaffRequest.id && submittingStatus === "Rejected" ? (
                    <Spinner size="sm" variant="white" className="mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => setViewStaffDialogOpen(false)}
                className="w-full"
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
