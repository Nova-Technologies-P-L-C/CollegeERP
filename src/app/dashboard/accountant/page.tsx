"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Search,
  RefreshCw,
  Printer,
  FileCheck,
  Building,
  UserCheck,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  BadgeAlert,
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
import { motion, AnimatePresence } from "framer-motion";
import { TableSkeleton, Spinner } from "@/components/ui";

interface PendingAdmission extends Record<string, unknown> {
  id: string;
  studentName: string;
  email: string;
  phone: string;
  appliedDepartment: string;
  applicationDate: string;
  status: "Pending" | "Approved" | "Rejected";
  fatherName: string | null;
  cnic: string | null;
  shift?: string;
  semester?: number;
  part?: number;
}

interface SemesterFee extends Record<string, unknown> {
  id: string;
  studentId: string;
  type: string;
  amount: number;
  status: "Paid" | "Unpaid" | "Overdue";
  dueDate: string;
  semester: number;
  paidDate: string | null;
  student: {
    id: string;
    rollNo: string;
    department: string;
    shift: string;
    user: { name: string | null };
  };
}

const PAYMENT_METHODS = [
  "Cash Deposit",
  "Commercial Bank of Ethiopia (CBE)",
  "Telebirr",
  "Awash Bank",
  "Dashen Bank",
  "Direct Bank Transfer",
];

export default function AccountantDeskPage() {
  const router = useRouter();
  const { programLevel } = useProgramLevel();

  const [activeTab, setActiveTab] = useState<"admissions" | "semester_fees">("admissions");
  const [loading, setLoading] = useState(true);
  const [admissions, setAdmissions] = useState<PendingAdmission[]>([]);
  const [semesterFees, setSemesterFees] = useState<SemesterFee[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [feeStatusFilter, setFeeStatusFilter] = useState<string>("all");

  // Payment Verification Dialog State (Admission Fee)
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<PendingAdmission | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Verification Form Inputs
  const [paymentForm, setPaymentForm] = useState({
    amount: "5000",
    method: "Commercial Bank of Ethiopia (CBE)",
    receiptNo: "",
    notes: "",
  });

  // Success Receipt Dialog State
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{
    studentName: string;
    rollNo: string;
    department: string;
    amount: number;
    receiptNo: string;
    method: string;
    date: string;
  } | null>(null);

  // Fetch Pending Admissions
  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("programLevel", programLevel);
      params.set("status", "Pending");
      const res = await api.get<PendingAdmission[]>(`/api/admissions?${params.toString()}`);
      setAdmissions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load pending admissions:", err);
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  }, [programLevel]);

  // Fetch Semester Tuition Fees
  const fetchSemesterFees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<SemesterFee[]>("/api/fees");
      setSemesterFees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load semester fees:", err);
      setSemesterFees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "admissions") {
      fetchAdmissions();
    } else {
      fetchSemesterFees();
    }
  }, [activeTab, fetchAdmissions, fetchSemesterFees]);

  // Handle Admission Payment Verification
  const handleConfirmAdmissionPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    setVerifyError(null);

    const paidAmt = parseFloat(paymentForm.amount);
    if (isNaN(paidAmt) || paidAmt <= 0) {
      setVerifyError("Please enter a valid payment amount.");
      return;
    }

    if (!paymentForm.receiptNo.trim()) {
      setVerifyError("Transaction Reference or Receipt Number is strictly required for financial audit.");
      return;
    }

    setVerifying(true);
    try {
      const res = await api.patch(`/api/admissions/${selectedAdmission.id}`, {
        status: "Approved",
        paymentMethod: paymentForm.method,
        receiptNo: paymentForm.receiptNo.trim(),
        paidAmount: paidAmt,
      });

      const generatedRollNo = res.data?.generatedRollNo || "Active Student";

      // Prepare receipt view
      setLastPaymentInfo({
        studentName: selectedAdmission.studentName,
        rollNo: generatedRollNo,
        department: selectedAdmission.appliedDepartment,
        amount: paidAmt,
        receiptNo: paymentForm.receiptNo.trim(),
        method: paymentForm.method,
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      });

      setVerifyOpen(false);
      setReceiptOpen(true);

      // Reset form
      setPaymentForm({
        amount: "5000",
        method: "Commercial Bank of Ethiopia (CBE)",
        receiptNo: "",
        notes: "",
      });

      fetchAdmissions();
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      setVerifyError(
        axiosErr.response?.data?.error ||
          axiosErr.message ||
          "Failed to verify payment and approve admission."
      );
    } finally {
      setVerifying(false);
    }
  };

  // Mark Semester Fee Paid
  const handleMarkSemesterFeePaid = async (feeId: string) => {
    const receipt = prompt("Enter Payment Reference / Receipt Number:");
    if (!receipt) return;

    try {
      await api.patch(`/api/fees/${feeId}`, {
        status: "Paid",
        paidDate: new Date().toISOString(),
      });
      fetchSemesterFees();
      router.refresh();
    } catch (err) {
      console.error("Failed to mark fee paid:", err);
      alert("Failed to update payment status.");
    }
  };

  // Print Official Receipt
  const handlePrintReceipt = () => {
    if (!lastPaymentInfo) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print official receipts.");
      return;
    }

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Official Payment Receipt - ${lastPaymentInfo.receiptNo}</title>
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
              border-bottom: 3px double #1d4ed8;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .title {
              font-size: 26px;
              font-weight: 900;
              color: #1d4ed8;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .subtitle {
              font-size: 15px;
              color: #4b5563;
              margin-top: 5px;
              font-weight: 700;
            }
            .receipt-banner {
              display: flex;
              justify-content: space-between;
              background: #f0fdf4;
              border: 1px solid #16a34a;
              color: #15803d;
              padding: 12px 20px;
              border-radius: 6px;
              font-weight: 700;
              margin-bottom: 25px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 14px;
              font-weight: 800;
              color: #374151;
              text-transform: uppercase;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 6px;
              margin-bottom: 14px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
            }
            .row {
              font-size: 14px;
              line-height: 1.6;
            }
            .label {
              font-weight: 600;
              color: #6b7280;
            }
            .value {
              font-weight: 800;
              color: #111827;
            }
            .amount-box {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin-top: 30px;
            }
            .amount-label {
              font-size: 13px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
            }
            .amount-value {
              font-size: 32px;
              font-weight: 900;
              color: #16a34a;
              margin-top: 4px;
            }
            .footer {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .signature-block {
              text-align: center;
              width: 220px;
            }
            .sig-line {
              border-top: 1px solid #111827;
              margin-top: 50px;
              padding-top: 6px;
              font-size: 13px;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Nova Technology ERP — Finance & Accounts</h1>
            <div class="subtitle">Official Tuition / Admission Payment Receipt</div>
          </div>

          <div class="receipt-banner">
            <div>RECEIPT NO: <strong>${lastPaymentInfo.receiptNo}</strong></div>
            <div>STATUS: <strong>VERIFIED & PAID</strong></div>
          </div>

          <div class="section">
            <div class="section-title">1. Student Information</div>
            <div class="grid">
              <div class="row"><span class="label">Student Full Name:</span> <span class="value">${lastPaymentInfo.studentName}</span></div>
              <div class="row"><span class="label">Official Roll Number:</span> <span class="value" style="color: #1d4ed8;">${lastPaymentInfo.rollNo}</span></div>
              <div class="row"><span class="label">Academic Department:</span> <span class="value">${lastPaymentInfo.department}</span></div>
              <div class="row"><span class="label">Date of Payment:</span> <span class="value">${lastPaymentInfo.date}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. Transaction & Payment Details</div>
            <div class="grid">
              <div class="row"><span class="label">Payment Purpose:</span> <span class="value">Official Admission & Registration Fee</span></div>
              <div class="row"><span class="label">Payment Method:</span> <span class="value">${lastPaymentInfo.method}</span></div>
              <div class="row"><span class="label">Reference / Bank Slip:</span> <span class="value">${lastPaymentInfo.receiptNo}</span></div>
              <div class="row"><span class="label">Issuing Desk:</span> <span class="value">Campus Accountant Office</span></div>
            </div>
          </div>

          <div class="amount-box">
            <div class="amount-label">Total Amount Paid (ETB)</div>
            <div class="amount-value">${lastPaymentInfo.amount.toLocaleString()} ETB</div>
            <div style="font-size: 12px; color: #16a34a; font-weight: 600; margin-top: 4px;">✓ FULLY CLEARED & PROVISIONED</div>
          </div>

          <div class="footer">
            <div class="signature-block">
              <div class="sig-line">Student Signature</div>
            </div>
            <div class="signature-block">
              <div class="sig-line">Chief Accountant / Stamp</div>
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

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  // Filter pending admissions
  const filteredAdmissions = useMemo(() => {
    return admissions.filter((a) => {
      return (
        searchQuery === "" ||
        a.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.phone.includes(searchQuery) ||
        (a.cnic && a.cnic.includes(searchQuery)) ||
        a.appliedDepartment.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [admissions, searchQuery]);

  // Filter semester fees
  const filteredSemesterFees = useMemo(() => {
    return semesterFees.filter((f) => {
      const matchesSearch =
        searchQuery === "" ||
        f.student.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.student.user.name &&
          f.student.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        f.type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        feeStatusFilter === "all" || f.status === feeStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [semesterFees, searchQuery, feeStatusFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const pendingAdmissionsCount = admissions.length;
    const paidFeesTotal = semesterFees
      .filter((f) => f.status === "Paid")
      .reduce((sum, f) => sum + f.amount, 0);
    const unpaidFeesCount = semesterFees.filter((f) => f.status === "Unpaid").length;
    const overdueFeesCount = semesterFees.filter((f) => f.status === "Overdue").length;

    return {
      pendingAdmissionsCount,
      paidFeesTotal,
      unpaidFeesCount,
      overdueFeesCount,
    };
  }, [admissions, semesterFees]);

  // Admission Table Columns
  const admissionColumns: Column<PendingAdmission>[] = [
    {
      key: "studentName",
      header: "Applicant Details",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-bold text-foreground">{row.studentName}</p>
          <p className="text-xs text-muted-foreground">{row.email} • {row.phone}</p>
        </div>
      ),
    },
    {
      key: "appliedDepartment",
      header: "Department / Program",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-foreground">{row.appliedDepartment}</span>
          <span className="text-xs text-muted-foreground ml-1.5 font-normal">
            ({row.shift || "Morning"})
          </span>
        </div>
      ),
    },
    {
      key: "cnic",
      header: "National / Fayda ID",
      render: (row) => (
        <span className="text-xs font-mono font-medium text-foreground">
          {row.cnic || "N/A"}
        </span>
      ),
    },
    {
      key: "applicationDate",
      header: "Registered Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.applicationDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Fee Queue",
      render: () => (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 flex w-fit items-center gap-1 font-semibold text-xs py-1"
        >
          <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
          Awaiting Verification
        </Badge>
      ),
    },
    {
      key: "id",
      header: "Payment Actions",
      render: (row) => (
        <Button
          size="sm"
          onClick={() => {
            setSelectedAdmission(row);
            setVerifyOpen(true);
          }}
          className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
        >
          <Receipt className="h-3.5 w-3.5" />
          Verify Payment & Admit
        </Button>
      ),
    },
  ];

  // Semester Fee Columns
  const feeColumns: Column<SemesterFee>[] = [
    {
      key: "student",
      header: "Student",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.student.user.name || "Student"}</p>
          <p className="text-xs font-mono text-muted-foreground">{row.student.rollNo}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Fee Description",
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.type}</p>
          <p className="text-xs text-muted-foreground">Semester {row.semester}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount (ETB)",
      sortable: true,
      render: (row) => (
        <span className="font-bold text-foreground">
          {row.amount.toLocaleString()} ETB
        </span>
      ),
    },
    {
      key: "status",
      header: "Payment Status",
      sortable: true,
      render: (row) => {
        if (row.status === "Paid") {
          return (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300">
              Paid
            </Badge>
          );
        }
        if (row.status === "Overdue") {
          return (
            <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300">
              Overdue
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300">
            Unpaid
          </Badge>
        );
      },
    },
    {
      key: "id",
      header: "Action",
      render: (row) => (
        row.status !== "Paid" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMarkSemesterFeePaid(row.id)}
            className="h-8 text-xs gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Paid
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Cleared</span>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accountant Desk"
        subtitle="Verify incoming admission payments, issue official student receipts, and monitor semester tuition collections."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Accountant Desk" },
        ]}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => (activeTab === "admissions" ? fetchAdmissions() : fetchSemesterFees())}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
        }
      />

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-amber-300/40 bg-amber-500/5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <span>Pending Admissions</span>
            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold text-amber-700 dark:text-amber-400">
            {stats.pendingAdmissionsCount}
          </div>
          <p className="text-xs text-muted-foreground">Awaiting payment verification</p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-300/40 bg-emerald-500/5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span>Tuition Collected</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
            {stats.paidFeesTotal.toLocaleString()} <span className="text-sm font-semibold">ETB</span>
          </div>
          <p className="text-xs text-muted-foreground">Total verified payments</p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Pending Invoices</span>
            <Receipt className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">{stats.unpaidFeesCount}</div>
          <p className="text-xs text-muted-foreground">Unpaid semester dues</p>
        </div>

        <div className="p-5 rounded-2xl border border-rose-300/40 bg-rose-500/5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <span>Overdue Invoices</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-3xl font-extrabold text-rose-700 dark:text-rose-400">
            {stats.overdueFeesCount}
          </div>
          <p className="text-xs text-muted-foreground">Exceeded payment due date</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === "admissions" ? "default" : "ghost"}
          onClick={() => setActiveTab("admissions")}
          className="gap-2 relative"
        >
          <UserCheck className="h-4 w-4" />
          Pending Admissions Verification
          {stats.pendingAdmissionsCount > 0 && (
            <Badge className="ml-1.5 h-5 px-1.5 bg-amber-500 text-white font-bold text-[11px]">
              {stats.pendingAdmissionsCount}
            </Badge>
          )}
        </Button>

        <Button
          variant={activeTab === "semester_fees" ? "default" : "ghost"}
          onClick={() => setActiveTab("semester_fees")}
          className="gap-2"
        >
          <CreditCard className="h-4 w-4" />
          Semester Dues & Tuition
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              activeTab === "admissions"
                ? "Search applicant name, phone, Fayda ID..."
                : "Search roll no, student name..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        {activeTab === "semester_fees" && (
          <Select value={feeStatusFilter} onValueChange={setFeeStatusFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Invoices</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Main Queue Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : activeTab === "admissions" ? (
          <DataTable
            columns={admissionColumns}
            data={filteredAdmissions}
          />
        ) : (
          <DataTable
            columns={feeColumns}
            data={filteredSemesterFees}
          />
        )}
      </div>

      {/* PAYMENT VERIFICATION MODAL */}
      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Verify Admission Payment & Issue Student ID
            </DialogTitle>
            <DialogDescription>
              Verify physical cash, bank slip, or Telebirr transfer. Once confirmed, the system will
              automatically issue the student&#39;s official Roll Number and activate their account.
            </DialogDescription>
          </DialogHeader>

          {verifyError && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg flex items-center gap-2">
              <BadgeAlert className="h-4 w-4 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          {selectedAdmission && (
            <form onSubmit={handleConfirmAdmissionPayment} className="space-y-4 pt-2">
              {/* Applicant Summary */}
              <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">APPLICANT:</span>
                  <span className="font-bold text-foreground text-sm">{selectedAdmission.studentName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Department:</span>
                  <span className="font-semibold text-brand-primary">{selectedAdmission.appliedDepartment}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Fayda ID / Contact:</span>
                  <span className="font-mono text-foreground">{selectedAdmission.cnic || selectedAdmission.phone}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="payAmount">Admission / Registration Fee (ETB) *</Label>
                  <Input
                    id="payAmount"
                    type="number"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payMethod">Payment Channel / Bank *</Label>
                  <Select
                    value={paymentForm.method}
                    onValueChange={(val) => setPaymentForm({ ...paymentForm, method: val })}
                  >
                    <SelectTrigger id="payMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="receiptNo">
                    Transaction Reference / Bank Slip Number *
                  </Label>
                  <Input
                    id="receiptNo"
                    required
                    placeholder="e.g. CBE-9284102 or TB-839210"
                    value={paymentForm.receiptNo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, receiptNo: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Required for institutional financial audit and dispute verification.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Accountant Remarks (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="e.g. First semester full payment verified"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVerifyOpen(false)}
                  disabled={verifying}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={verifying}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold"
                >
                  {verifying ? (
                    <>
                      <Spinner size="sm" variant="secondary" />
                      Provisioning...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Confirm Payment & Issue Student ID
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* OFFICIAL RECEIPT CONFIRMATION MODAL */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 font-bold">
              <CheckCircle2 className="h-6 w-6" />
              Admission Payment Cleared!
            </DialogTitle>
            <DialogDescription>
              The student has been officially admitted and course enrollments are active.
            </DialogDescription>
          </DialogHeader>

          {lastPaymentInfo && (
            <div className="space-y-4 py-2 text-sm">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-emerald-200 dark:border-emerald-800">
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    OFFICIAL ROLL NO
                  </span>
                  <span className="text-base font-black text-brand-primary">
                    {lastPaymentInfo.rollNo}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Student Name:</span>
                  <span className="font-bold text-foreground">{lastPaymentInfo.studentName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Department:</span>
                  <span className="font-medium text-foreground">{lastPaymentInfo.department}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Amount Paid:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {lastPaymentInfo.amount.toLocaleString()} ETB
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Receipt Number:</span>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {lastPaymentInfo.receiptNo}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-400/30 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                🖨️ Hand over the printed receipt to the student. They can now log in using their credentials and view their course timetable.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handlePrintReceipt}
              className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950"
            >
              <Printer className="h-4 w-4" />
              Print Official Receipt
            </Button>
            <Button onClick={() => setReceiptOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
