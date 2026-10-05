"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import {
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Printer,
  RefreshCw,
  Search,
  BookOpen,
  School,
  FileText,
  BadgeAlert,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { useProgramLevel } from "@/context/program-level-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { motion } from "framer-motion";
import { TableSkeleton, Spinner } from "@/components/ui";

interface Admission extends Record<string, unknown> {
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
  discipline?: string | null;
  part?: number | null;
}

interface CourseOption {
  id: string;
  courseCode: string;
  courseName: string;
  department: string;
  semester: number;
}

const DEPARTMENTS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Economics",
  "English",
  "Urdu",
  "Islamic Studies",
];

const DISCIPLINES_INTERMEDIATE = [
  "FSc Pre-Medical",
  "FSc Pre-Engineering",
  "ICS (Computer Science)",
  "I.Com (Commerce)",
  "FA (Arts)",
];

export default function RegistrarDeskPage() {
  const router = useRouter();
  const { programLevel } = useProgramLevel();

  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  // Registration Dialog State
  const [registerOpen, setRegisterOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // View / Print Slip State
  const [viewAdmission, setViewAdmission] = useState<Admission | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    studentName: "",
    fatherName: "",
    email: "",
    phone: "",
    cnic: "", // Fayda ID / National ID
    appliedDepartment: "Computer Science",
    discipline: "ICS (Computer Science)",
    shift: "Morning",
    semester: 1,
    part: 1,
    previousInstitution: "",
    marksObtained: "",
    totalMarks: "1000",
    selectedCourses: [] as string[],
  });

  // Fetch admissions
  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("programLevel", programLevel);
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const res = await api.get<Admission[]>(`/api/admissions?${params.toString()}`);
      setAdmissions(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      console.error("Failed to load admissions:", err);
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  }, [programLevel, statusFilter]);

  // Fetch available courses
  useEffect(() => {
    api
      .get<CourseOption[]>("/api/courses")
      .then((res) => setCourses(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Failed to load courses:", err));
  }, []);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = admissions.length;
    const pending = admissions.filter((a) => a.status === "Pending").length;
    const approved = admissions.filter((a) => a.status === "Approved").length;
    const rejected = admissions.filter((a) => a.status === "Rejected").length;
    return { total, pending, approved, rejected };
  }, [admissions]);

  // Filtered Admissions list
  const filteredAdmissions = useMemo(() => {
    return admissions.filter((a) => {
      const matchesSearch =
        searchQuery === "" ||
        a.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.phone.includes(searchQuery) ||
        (a.cnic && a.cnic.includes(searchQuery));

      const matchesDept =
        deptFilter === "all" ||
        a.appliedDepartment.toLowerCase() === deptFilter.toLowerCase();

      return matchesSearch && matchesDept;
    });
  }, [admissions, searchQuery, deptFilter]);

  // Handle Form Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const marksObt = parseFloat(formData.marksObtained);
      const totalMks = parseFloat(formData.totalMarks);

      if (isNaN(marksObt) || marksObt < 0) {
        throw new Error("Please enter valid marks obtained.");
      }
      if (isNaN(totalMks) || totalMks <= 0) {
        throw new Error("Please enter valid total marks.");
      }
      if (marksObt > totalMks) {
        throw new Error("Marks obtained cannot exceed total marks.");
      }

      const payload = {
        studentName: formData.studentName.trim(),
        fatherName: formData.fatherName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        cnic: formData.cnic.trim(),
        programLevel,
        appliedDepartment:
          programLevel === "BS" ? formData.appliedDepartment : formData.discipline,
        discipline:
          programLevel === "INTERMEDIATE" ? formData.discipline : undefined,
        shift: formData.shift,
        semester: programLevel === "BS" ? formData.semester : undefined,
        part: programLevel === "INTERMEDIATE" ? formData.part : undefined,
        previousInstitution: formData.previousInstitution.trim() || "N/A",
        marksObtained: marksObt,
        totalMarks: totalMks,
        selectedCourses: formData.selectedCourses,
      };

      const res = await api.post("/api/admissions", payload);
      setSuccessMsg(
        `✅ Registered successfully! Application for "${formData.studentName}" has been routed to the Accountant Desk for fee verification.`
      );
      setRegisterOpen(false);

      // Reset form
      setFormData({
        studentName: "",
        fatherName: "",
        email: "",
        phone: "",
        cnic: "",
        appliedDepartment: "Computer Science",
        discipline: "ICS (Computer Science)",
        shift: "Morning",
        semester: 1,
        part: 1,
        previousInstitution: "",
        marksObtained: "",
        totalMarks: "1000",
        selectedCourses: [],
      });

      fetchAdmissions();
      router.refresh();

      // Show the newly created admission slip
      if (res.data) {
        setViewAdmission(res.data);
        setViewOpen(true);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      setErrorMsg(
        axiosErr.response?.data?.error ||
          axiosErr.message ||
          "Failed to submit student registration."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete / cancel applicant
  const handleDeleteAdmission = async (id: string) => {
    if (!confirm("Are you sure you want to cancel and delete this registration?")) return;
    try {
      await api.delete(`/api/admissions/${id}`);
      setAdmissions((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    } catch (err) {
      console.error("Failed to delete admission:", err);
      alert("Failed to delete application record.");
    }
  };

  // Print Admission Slip
  const handlePrintSlip = (admission: Admission) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the admission slip.");
      return;
    }

    const regDate = new Date(admission.applicationDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const slipHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Admission Slip - ${admission.studentName}</title>
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            body {
              padding: 40px;
              color: #111827;
              background: #ffffff;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #1d4ed8;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              color: #1d4ed8;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .subtitle {
              font-size: 14px;
              color: #4b5563;
              margin-top: 4px;
              font-weight: 600;
            }
            .badge-box {
              display: inline-block;
              background: #fef3c7;
              color: #92400e;
              border: 1px solid #f59e0b;
              padding: 6px 14px;
              font-size: 13px;
              font-weight: 700;
              border-radius: 4px;
              margin-top: 10px;
            }
            .section {
              margin-bottom: 20px;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #374151;
              text-transform: uppercase;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 6px;
              margin-bottom: 12px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .row {
              font-size: 13px;
              line-height: 1.6;
            }
            .label {
              font-weight: 600;
              color: #6b7280;
            }
            .value {
              font-weight: 700;
              color: #111827;
            }
            .payment-box {
              border: 2px dashed #d97706;
              background: #fffbeb;
              padding: 16px;
              border-radius: 6px;
              margin-top: 25px;
            }
            .payment-title {
              font-size: 15px;
              font-weight: 800;
              color: #b45309;
              margin-bottom: 6px;
            }
            .payment-desc {
              font-size: 12px;
              color: #78350f;
              line-height: 1.5;
            }
            .footer {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .signature-block {
              text-align: center;
              width: 200px;
            }
            .sig-line {
              border-top: 1px solid #111827;
              margin-top: 40px;
              padding-top: 4px;
              font-size: 12px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Nova Technology ERP — Registrar Desk</h1>
            <div class="subtitle">Official Student Admission Slip & Fee Payment Order</div>
            <div class="badge-box">STATUS: AWAITING ACCOUNTANT FEE CLEARANCE</div>
          </div>

          <div class="section">
            <div class="section-title">1. Applicant Credentials</div>
            <div class="grid">
              <div class="row"><span class="label">Full Name:</span> <span class="value">${admission.studentName}</span></div>
              <div class="row"><span class="label">Father / Guardian:</span> <span class="value">${admission.fatherName || "N/A"}</span></div>
              <div class="row"><span class="label">National / Fayda ID:</span> <span class="value">${admission.cnic || "N/A"}</span></div>
              <div class="row"><span class="label">Phone Contact:</span> <span class="value">${admission.phone}</span></div>
              <div class="row"><span class="label">Email Address:</span> <span class="value">${admission.email}</span></div>
              <div class="row"><span class="label">Registered On:</span> <span class="value">${regDate}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. Academic Program & Allocation</div>
            <div class="grid">
              <div class="row"><span class="label">Department / Program:</span> <span class="value">${admission.appliedDepartment}</span></div>
              <div class="row"><span class="label">Shift:</span> <span class="value">${admission.shift || "Morning"}</span></div>
              <div class="row"><span class="label">Initial Semester:</span> <span class="value">Semester ${admission.semester || 1}</span></div>
              <div class="row"><span class="label">Previous Institution:</span> <span class="value">${admission.previousInstitution || "N/A"}</span></div>
              <div class="row"><span class="label">Entrance / Previous Marks:</span> <span class="value">${admission.marksObtained} / ${admission.totalMarks}</span></div>
            </div>
          </div>

          <div class="payment-box">
            <div class="payment-title">INSTRUCTIONS FOR APPLICANT:</div>
            <div class="payment-desc">
              Please present this official slip to the <strong>Campus Finance / Accountant Desk</strong> to complete admission fee payment (Cash, CBE, or Telebirr). Once verified by the Accountant, your official Roll Number and Student ID card will be activated.
            </div>
          </div>

          <div class="footer">
            <div class="signature-block">
              <div class="sig-line">Academic Registrar</div>
            </div>
            <div class="signature-block">
              <div class="sig-line">Accountant / Cashier Stamp</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(slipHtml);
    printWindow.document.close();
  };

  // Table columns definition
  const columns: Column<Admission>[] = [
    {
      key: "studentName",
      header: "Applicant",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.studentName}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: "appliedDepartment",
      header: "Department / Program",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-foreground">{row.appliedDepartment}</span>
          <span className="text-xs text-muted-foreground ml-1.5 font-normal">
            ({row.shift || "Morning"})
          </span>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Contact / Fayda ID",
      render: (row) => (
        <div className="text-xs">
          <p className="font-medium text-foreground">{row.phone}</p>
          <p className="text-muted-foreground">{row.cnic || "ID: N/A"}</p>
        </div>
      ),
    },
    {
      key: "applicationDate",
      header: "Registered",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.applicationDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Admissions Status",
      sortable: true,
      render: (row) => {
        if (row.status === "Pending") {
          return (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 flex w-fit items-center gap-1 font-semibold text-xs py-1"
            >
              <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              Awaiting Fee Clearance
            </Badge>
          );
        }
        if (row.status === "Approved") {
          return (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 flex w-fit items-center gap-1 font-semibold text-xs py-1"
            >
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              Payment Cleared & Enrolled
            </Badge>
          );
        }
        return (
          <Badge
            variant="outline"
            className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700 flex w-fit items-center gap-1 font-semibold text-xs py-1"
          >
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            Rejected
          </Badge>
        );
      },
    },
    {
      key: "id",
      header: "Desk Actions",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePrintSlip(row)}
            className="h-8 px-2.5 text-xs gap-1 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
            title="Print Admission Slip for Student"
          >
            <Printer className="h-3.5 w-3.5" />
            Slip
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setViewAdmission(row);
              setViewOpen(true);
            }}
            className="h-8 w-8 p-0"
            title="View Details"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
          </Button>
          {row.status === "Pending" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteAdmission(row.id)}
              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
              title="Cancel Registration"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrar Desk"
        subtitle="Register new student applicants, verify academic prerequisites, and queue for accountant fee clearance."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Registrar Desk" },
        ]}
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAdmissions}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setRegisterOpen(true)}
              className="gap-2 bg-brand-primary text-white hover:opacity-90 shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              Register New Student
            </Button>
          </div>
        }
      />

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between"
        >
          <span>{successMsg}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSuccessMsg(null)}
            className="h-7 text-xs text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900"
          >
            Dismiss
          </Button>
        </motion.div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Total Applicants</span>
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">{stats.total}</div>
          <p className="text-xs text-muted-foreground">Registered on current level</p>
        </div>

        <div className="p-5 rounded-2xl border border-amber-300/40 bg-amber-500/5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <span>Awaiting Payment</span>
            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {stats.pending}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span>Queued for Accountant Desk</span>
            <ArrowRight className="h-3 w-3" />
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-300/40 bg-emerald-500/5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span>Payment Cleared</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats.approved}
          </div>
          <p className="text-xs text-muted-foreground">Active official students</p>
        </div>

        <div className="p-5 rounded-2xl border border-rose-300/40 bg-rose-500/5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <span>Rejected</span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {stats.rejected}
          </div>
          <p className="text-xs text-muted-foreground">Cancelled or ineligible</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, Fayda ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Awaiting Payment</SelectItem>
              <SelectItem value="Approved">Payment Cleared</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Department Filter" />
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
      </div>

      {/* Main Applicants Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredAdmissions}
          />
        )}
      </div>

      {/* REGISTER NEW STUDENT MODAL */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <UserPlus className="h-5 w-5 text-brand-primary" />
              Register New Student (Registrar Desk)
            </DialogTitle>
            <DialogDescription>
              Enter student information. Upon registration, the application will immediately enter the
              <strong> Awaiting Fee Clearance</strong> queue at the Accountant Desk.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg flex items-center gap-2">
              <BadgeAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="studentName">Student Full Name *</Label>
                <Input
                  id="studentName"
                  required
                  placeholder="e.g. Abebe Bikila"
                  value={formData.studentName}
                  onChange={(e) =>
                    setFormData({ ...formData, studentName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fatherName">Father / Guardian Name *</Label>
                <Input
                  id="fatherName"
                  required
                  placeholder="e.g. Bikila Demissie"
                  value={formData.fatherName}
                  onChange={(e) =>
                    setFormData({ ...formData, fatherName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  required
                  placeholder="e.g. 0911234567"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="e.g. abebe@gmail.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cnic">National / Fayda ID *</Label>
                <Input
                  id="cnic"
                  required
                  placeholder="e.g. FAN-12345678"
                  value={formData.cnic}
                  onChange={(e) =>
                    setFormData({ ...formData, cnic: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shift">Shift</Label>
                <Select
                  value={formData.shift}
                  onValueChange={(val: string) => setFormData({ ...formData, shift: val })}
                >
                  <SelectTrigger id="shift">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {programLevel === "BS" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="dept">Target Department *</Label>
                  <Select
                    value={formData.appliedDepartment}
                    onValueChange={(val) =>
                      setFormData({ ...formData, appliedDepartment: val })
                    }
                  >
                    <SelectTrigger id="dept">
                      <SelectValue />
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
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="discipline">Discipline (Intermediate) *</Label>
                  <Select
                    value={formData.discipline}
                    onValueChange={(val) =>
                      setFormData({ ...formData, discipline: val })
                    }
                  >
                    <SelectTrigger id="discipline">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCIPLINES_INTERMEDIATE.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="prevSchool">Previous School / College</Label>
                <Input
                  id="prevSchool"
                  placeholder="e.g. Bole Senior Secondary"
                  value={formData.previousInstitution}
                  onChange={(e) =>
                    setFormData({ ...formData, previousInstitution: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="marksObtained">Marks Obtained *</Label>
                <Input
                  id="marksObtained"
                  type="number"
                  required
                  placeholder="e.g. 850"
                  value={formData.marksObtained}
                  onChange={(e) =>
                    setFormData({ ...formData, marksObtained: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="totalMarks">Total Possible Marks *</Label>
                <Input
                  id="totalMarks"
                  type="number"
                  required
                  placeholder="e.g. 1000"
                  value={formData.totalMarks}
                  onChange={(e) =>
                    setFormData({ ...formData, totalMarks: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRegisterOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-brand-primary text-white hover:opacity-90 gap-2"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" variant="secondary" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Complete Registration & Send to Accountant
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS / PRINT SLIP MODAL */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Applicant Registration Slip
            </DialogTitle>
            <DialogDescription>
              Share this reference with the student to present at the Accountant desk.
            </DialogDescription>
          </DialogHeader>

          {viewAdmission && (
            <div className="space-y-4 py-2 text-sm">
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-muted-foreground text-xs font-semibold">APPLICANT</span>
                  <span className="font-bold text-foreground">{viewAdmission.studentName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Father/Guardian:</span>
                  <span className="font-medium text-foreground">{viewAdmission.fatherName || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Fayda ID:</span>
                  <span className="font-medium text-foreground">{viewAdmission.cnic || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Department:</span>
                  <span className="font-semibold text-brand-primary">{viewAdmission.appliedDepartment}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Shift:</span>
                  <span className="font-medium text-foreground">{viewAdmission.shift || "Morning"}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-muted-foreground text-xs font-semibold">STATUS:</span>
                  <Badge
                    variant="outline"
                    className={
                      viewAdmission.status === "Pending"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                    }
                  >
                    {viewAdmission.status === "Pending"
                      ? "Awaiting Fee Clearance"
                      : "Payment Cleared & Enrolled"}
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-400/30 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                👉 Direct the applicant to the <strong>Accountant Desk</strong> with their Fayda ID to complete the tuition fee deposit and receive their active Student Roll Number.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {viewAdmission && (
              <Button
                variant="outline"
                onClick={() => handlePrintSlip(viewAdmission)}
                className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <Printer className="h-4 w-4" />
                Print Official Slip
              </Button>
            )}
            <Button onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
