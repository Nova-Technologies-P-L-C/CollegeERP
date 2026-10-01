"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getLocalTodayString } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, Column } from "@/components/dashboard/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useProgramLevel } from "@/context/program-level-context";
import {
  getDisciplinesForLevel,
  getTermOptionsForLevel,
  formatTermLabel,
  getSubjectSetFilterConfig,
} from "@/lib/constants";

interface FeeWithStudent {
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
    semester: number;
    shift: string;
    user: { name: string | null };
  };
}

interface StudentItem {
  id: string;
  userId: string;
  rollNo: string;
  phone: string | null;
  department: string;
  semester: number;
  shift: string;
  enrollmentDate: string;
  avatar: string | null;
  user: { name: string | null; email: string };
  _count?: { enrollments: number };
}

interface StudentDuesItem extends StudentItem {
  stats: {
    paid: number;
    unpaid: number;
    overdue: number;
    total: number;
  };
}

const statusColors: Record<"Paid" | "Unpaid" | "Overdue", string> = {
  Paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Unpaid: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Overdue: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

const statusIcons = {
  Paid: CheckCircle2,
  Unpaid: Clock,
  Overdue: AlertCircle,
};

export default function ManageDuesPage() {
  const router = useRouter();
  const { programLevel } = useProgramLevel();
  const [fees, setFees] = useState<FeeWithStudent[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Drill-down states
  const [selectedDept, setSelectedDept] = useState<string | null>("Computer Science");
  const [selectedSemester, setSelectedSemester] = useState<number | null>(1);
  const [selectedShift, setSelectedShift] = useState<string>("Morning");
  const [selectedSet, setSelectedSet] = useState<string>("Set 1");

  useEffect(() => {
    if (programLevel === "INTERMEDIATE") {
      setSelectedDept("F.Sc Pre-Engineering");
    } else {
      setSelectedDept("Computer Science");
    }
  }, [programLevel]);

  // Dialog control states
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const [selectedFee, setSelectedFee] = useState<FeeWithStudent | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentDuesItem | null>(null);
  const [isBulkAssignment, setIsBulkAssignment] = useState(true);

  const [mutationError, setMutationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deletingFeeId, setDeletingFeeId] = useState<string | null>(null);
  const [payingFeeId, setPayingFeeId] = useState<string | null>(null);

  const [newFee, setNewFee] = useState({
    studentId: "",
    type: "Tuition Fee",
    amount: "",
    dueDate: getLocalTodayString(),
  });

  const loadData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("programLevel", programLevel);
    Promise.all([
      api.get<StudentItem[]>(`/api/students?${params.toString()}`),
      api.get<FeeWithStudent[]>(`/api/fees?${params.toString()}`),
    ])
      .then(([studentsRes, feesRes]) => {
        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
        setFees(Array.isArray(feesRes.data) ? feesRes.data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [programLevel]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkPaid = async (feeId: string) => {
    setPayingFeeId(feeId);
    try {
      await api.patch(`/api/fees/${feeId}`, {
        status: "Paid",
        paidDate: new Date().toISOString(),
      });
      setFees((prev) =>
        prev.map((f) =>
          f.id === feeId
            ? {
              ...f,
              status: "Paid" as const,
              paidDate: new Date().toISOString(),
            }
            : f
        )
      );
      setPayDialogOpen(false);
      setSelectedFee(null);
      router.refresh();
    } catch {
      /* ignore */
    } finally {
      setPayingFeeId(null);
    }
  };

  const handleDeleteFee = async (id: string) => {
    setDeletingFeeId(id);
    try {
      await api.delete(`/api/fees/${id}`);
      setFees((prev) => prev.filter((f) => f.id !== id));
      router.refresh();
    } catch (err: unknown) {
      console.error("Delete fee error:", err);
    } finally {
      setDeletingFeeId(null);
    }
  };

  const handleCreateFee = async () => {
    setMutationError(null);
    if (!isBulkAssignment && !newFee.studentId) {
      setMutationError("Please select a student");
      return;
    }
    if (!newFee.amount || !newFee.dueDate) {
      setMutationError("Please enter amount and due date");
      return;
    }

    setSubmitting(true);
    try {
      if (isBulkAssignment) {
        await api.post("/api/fees", {
          isBulk: true,
          department: selectedDept,
          semester: selectedSemester,
          shift: selectedShift,
          subjectSet: selectedSet,
          type: newFee.type,
          amount: parseFloat(newFee.amount),
          dueDate: new Date(newFee.dueDate).toISOString(),
        });
      } else {
        await api.post("/api/fees", {
          studentId: newFee.studentId,
          type: newFee.type,
          amount: parseFloat(newFee.amount),
          dueDate: new Date(newFee.dueDate).toISOString(),
          semester: selectedSemester,
        });
      }
      setCreateDialogOpen(false);
      setNewFee({
        studentId: "",
        type: "Tuition Fee",
        amount: "",
        dueDate: getLocalTodayString(),
      });
      loadData();
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setMutationError(axiosErr.response?.data?.error ?? "Failed to assign fee");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter students in the selected class/shift
  const classStudents = useMemo(() => {
    if (!selectedDept || !selectedSemester) return [];
    return students.filter((s) => {
      const matchesDept = s.department === selectedDept;
      const matchesSem = s.semester === selectedSemester;
      const matchesShift = programLevel === "BS" ? s.shift === selectedShift : true;

      if (programLevel === "INTERMEDIATE") {
        const setConfig = getSubjectSetFilterConfig(selectedDept || "");
        const activeSet = setConfig.hasMultipleSets ? (selectedSet || "Set 1") : "Set 1";
        const matchesSet = !(s as { subjectSet?: string }).subjectSet || (s as { subjectSet?: string }).subjectSet?.toLowerCase() === activeSet.toLowerCase();
        return matchesDept && matchesSem && matchesSet;
      }

      return matchesDept && matchesSem && matchesShift;
    });
  }, [students, selectedDept, selectedSemester, selectedShift, selectedSet, programLevel]);

  // Compute dues statistics for each student in the selected class
  const studentDues = useMemo(() => {
    return classStudents.map((student) => {
      const studentFees = fees.filter((f) => f.studentId === student.id);
      const paid = studentFees
        .filter((f) => f.status === "Paid")
        .reduce((sum, f) => sum + f.amount, 0);
      const unpaid = studentFees
        .filter((f) => f.status === "Unpaid")
        .reduce((sum, f) => sum + f.amount, 0);
      const overdue = studentFees
        .filter((f) => f.status === "Overdue")
        .reduce((sum, f) => sum + f.amount, 0);

      return {
        ...student,
        stats: {
          paid,
          unpaid,
          overdue,
          total: paid + unpaid + overdue,
        },
      };
    });
  }, [classStudents, fees]);

  // Compute overall class dues stats
  const classStats = useMemo(() => {
    let overallPaid = 0;
    let overallUnpaid = 0;
    let overallOverdue = 0;

    studentDues.forEach((s) => {
      overallPaid += s.stats.paid;
      overallUnpaid += s.stats.unpaid;
      overallOverdue += s.stats.overdue;
    });

    return {
      totalStudents: classStudents.length,
      overallPaid,
      overallUnpaid,
      overallOverdue,
      overallTotal: overallPaid + overallUnpaid + overallOverdue,
    };
  }, [studentDues, classStudents]);

  // Get fees of selected student for detailed logs dialog
  const selectedStudentFees = useMemo(() => {
    if (!selectedStudent) return [];
    return fees.filter((f) => f.studentId === selectedStudent.id);
  }, [selectedStudent, fees]);

  const columns: Column<StudentDuesItem>[] = [
    {
      key: "user",
      header: "Student",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.user?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.rollNo}</p>
        </div>
      ),
    },
    {
      key: "paid",
      header: "Paid (Rs.)",
      render: (row) => (
        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
          Rs. {row.stats.paid.toLocaleString()}
        </span>
      ),
    },
    {
      key: "unpaid",
      header: "Unpaid (Rs.)",
      render: (row) => (
        <span className="text-amber-600 dark:text-amber-400 font-bold">
          Rs. {row.stats.unpaid.toLocaleString()}
        </span>
      ),
    },
    {
      key: "overdue",
      header: "Overdue (Rs.)",
      render: (row) => (
        <span className="text-rose-600 dark:text-rose-400 font-bold">
          Rs. {row.stats.overdue.toLocaleString()}
        </span>
      ),
    },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStudent(row);
              setNewFee((prev) => ({ ...prev, studentId: row.id }));
              setIsBulkAssignment(false);
              setCreateDialogOpen(true);
            }}
            className="h-8 text-xs gap-1 border-brand-primary/20 hover:bg-brand-primary hover:text-white transition-all rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            Assign Fee
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStudent(row);
              setHistoryDialogOpen(true);
            }}
            className="h-8 text-xs gap-1 border-brand-primary/20 hover:bg-brand-primary hover:text-white transition-all rounded-lg"
          >
            <Eye className="h-3.5 w-3.5" />
            Dues History
          </Button>
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title="Account Dues"
        subtitle={`Total Outstanding: Rs. ${fees
          .filter((f) => f.status !== "Paid")
          .reduce((acc, f) => acc + f.amount, 0)
          .toLocaleString()}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Dues" },
        ]}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 shadow-[2px_2px_0px_0px_var(--border)] cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--border)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_var(--border)] transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        {loading ? (
          <TableSkeleton rows={10} />
        ) : (
          <>
            {/* Top panel actions */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border border-border w-full">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    {programLevel === "INTERMEDIATE" ? "Discipline:" : "Dept:"}
                  </Label>
                  <Select value={selectedDept || ""} onValueChange={setSelectedDept}>
                    <SelectTrigger className="w-[180px] h-10 bg-card rounded-xl">
                      <SelectValue placeholder={programLevel === "INTERMEDIATE" ? "Select Discipline" : "Select Department"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getDisciplinesForLevel(programLevel).map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    {programLevel === "INTERMEDIATE" ? "Part:" : "Sem:"}
                  </Label>
                  <Select
                    value={String(selectedSemester || 1)}
                    onValueChange={(v) => setSelectedSemester(Number(v))}
                  >
                    <SelectTrigger className="w-[140px] h-10 bg-card rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getTermOptionsForLevel(programLevel).map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {formatTermLabel(programLevel, s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {programLevel === "INTERMEDIATE" && getSubjectSetFilterConfig(selectedDept || "").hasMultipleSets && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Subject Set:</Label>
                    <Select value={selectedSet || "Set 1"} onValueChange={setSelectedSet}>
                      <SelectTrigger className="w-[140px] h-10 bg-card rounded-xl font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getSubjectSetFilterConfig(selectedDept || "").availableSets.map((set) => (
                          <SelectItem key={set} value={set}>
                            {set}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {programLevel === "BS" && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">Shift:</Label>
                    <Select value={selectedShift} onValueChange={setSelectedShift}>
                      <SelectTrigger className="w-[120px] h-10 bg-card rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Morning">Morning</SelectItem>
                        <SelectItem value="Evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="ml-auto">
                  <Button
                    onClick={() => {
                      setIsBulkAssignment(true);
                      setNewFee((prev) => ({ ...prev, studentId: "" }));
                      setCreateDialogOpen(true);
                    }}
                    className="bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl shadow-lg shadow-brand-primary/20 h-10"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Class Dues (Bulk)
                  </Button>
                </div>
              </div>
            </div>

            {/* Dues Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-5 bg-card border-2 border-border rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-sm font-semibold text-muted-foreground uppercase">Total Students</span>
                <span className="text-3xl font-extrabold text-foreground mt-2">{classStats.totalStudents}</span>
              </div>
              <div className="p-5 bg-card border-2 border-border rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-sm font-semibold text-muted-foreground uppercase">Total Class Dues</span>
                <span className="text-3xl font-extrabold text-foreground mt-2">
                  Rs. {classStats.overallTotal.toLocaleString()}
                </span>
              </div>
              <div className="p-5 bg-card border-2 border-border rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-sm font-semibold text-muted-foreground uppercase">Total Dues Collected</span>
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                  Rs. {classStats.overallPaid.toLocaleString()}
                </span>
              </div>
              <div className="p-5 bg-card border-2 border-border rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-sm font-semibold text-muted-foreground uppercase">Outstanding Dues</span>
                <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
                  Rs. {(classStats.overallUnpaid + classStats.overallOverdue).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Student Table */}
            <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm p-4">
              <DataTable
                data={studentDues}
                columns={columns}
                searchPlaceholder="Search by student name or roll no..."
              />
            </div>
          </>
        )}
      </div>

      {/* Confirmation Pay Receipt Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this fee record as <strong>Paid</strong>?
            </DialogDescription>
          </DialogHeader>

          {selectedFee && (
            <div className="p-4 rounded-2xl bg-accent/30 border border-border">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground uppercase">Amount Due</span>
                <span className="text-lg font-bold text-brand-primary">
                  Rs. {selectedFee.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground uppercase">Fee Type</span>
                <span className="text-sm font-medium">{selectedFee.type}</span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:justify-end">
            <Button variant="ghost" disabled={payingFeeId !== null} onClick={() => setPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedFee && handleMarkPaid(selectedFee.id)}
              disabled={payingFeeId !== null}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg shadow-brand-primary/20 rounded-xl"
            >
              {payingFeeId !== null && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {payingFeeId !== null ? "Confirming..." : "Confirm Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Assign Dues Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>{isBulkAssignment ? "Assign Class Dues (Bulk)" : "Assign Student Fee"}</DialogTitle>
            <DialogDescription>
              {isBulkAssignment
                ? `Assigning fee to all students in ${selectedDept} Semester ${selectedSemester} (${selectedShift} Shift)`
                : `Assigning fee record to ${selectedStudent?.user?.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {mutationError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
                {mutationError}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="feeType">Fee Type</Label>
              <Input
                id="feeType"
                placeholder="e.g. Tuition Fee, Exam Fee, Sports Fee"
                value={newFee.type}
                onChange={(e) => setNewFee({ ...newFee, type: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount (Rs.)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="e.g. 45000"
                  value={newFee.amount}
                  onChange={(e) => setNewFee({ ...newFee, amount: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="grid gap-2">
                <Label>{programLevel === "INTERMEDIATE" ? "Part" : "Semester"}</Label>
                <Input
                  type="text"
                  disabled
                  value={formatTermLabel(programLevel, selectedSemester ?? 1)}
                  className="h-10 rounded-xl bg-accent/40"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={newFee.dueDate}
                onChange={(e) => setNewFee({ ...newFee, dueDate: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateFee}
              disabled={submitting}
              className="bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl shadow-lg shadow-brand-primary/20"
            >
              {submitting ? "Processing..." : isBulkAssignment ? "Bulk Assign Dues" : "Assign Fee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dues History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px] border-none shadow-2xl overflow-hidden rounded-3xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-brand-primary via-brand-secondary to-brand-primary" />
          <DialogHeader className="pt-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              Dues History Log
            </DialogTitle>
            <DialogDescription>
              Reviewing all dues and payments for <strong>{selectedStudent?.user?.name}</strong> ({selectedStudent?.rollNo})
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[60vh] overflow-y-auto pr-1">
            {selectedStudentFees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No fee records found for this student.</p>
            ) : (
              <div className="space-y-3">
                {selectedStudentFees.map((fee) => {
                  const Icon = statusIcons[fee.status];
                  return (
                    <div
                      key={fee.id}
                      className="p-4 bg-accent/40 border border-border rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-foreground">
                          {fee.type} - <span className="text-xs text-muted-foreground">Semester {fee.semester}</span>
                        </p>
                        <p className="text-sm font-bold text-brand-primary">Rs. {fee.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Due: {new Date(fee.dueDate).toLocaleDateString()}
                          {fee.paidDate && ` | Paid: ${new Date(fee.paidDate).toLocaleDateString()}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={`${statusColors[fee.status]} font-bold`}>
                          <Icon className="h-3 w-3 mr-1 inline" />
                          {fee.status}
                        </Badge>

                        {fee.status !== "Paid" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFee(fee);
                              setPayDialogOpen(true);
                            }}
                            className="h-8 text-xs border-emerald-600/30 hover:bg-emerald-600 hover:text-white transition-all rounded-lg"
                          >
                            Mark Paid
                          </Button>
                        )}

                        <button
                          onClick={() => handleDeleteFee(fee.id)}
                          disabled={deletingFeeId === fee.id}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-500 disabled:opacity-50"
                          title="Delete Fee"
                        >
                          {deletingFeeId === fee.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
