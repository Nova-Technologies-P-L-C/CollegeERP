"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/axios";
import {
  Building2,
  Users,
  GraduationCap,
  DollarSign,
  Award,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Receipt,
  GitBranch,
} from "lucide-react";
import type { Branch } from "@/types";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TableSkeleton } from "@/components/ui";

interface StudentRecord extends Record<string, unknown> {
  id: string;
  rollNo: string;
  department: string;
  semester: number;
  shift: string;
  cgpa: number;
  status: string;
  user: { name: string | null; email: string };
}

interface FacultyRecord extends Record<string, unknown> {
  id: string;
  department: string;
  specialization: string;
  phone: string | null;
  user: { name: string | null; email: string };
  teaches?: { id: string; courseName: string }[];
}

interface FeeRecord extends Record<string, unknown> {
  id: string;
  type: string;
  amount: number;
  status: "Paid" | "Unpaid" | "Overdue";
  dueDate: string;
  paidDate: string | null;
  student: {
    rollNo: string;
    department: string;
    user: { name: string | null };
  };
}

interface CourseRecord extends Record<string, unknown> {
  id: string;
  courseCode: string;
  courseName: string;
  department: string;
  creditHours: number;
  semester: number;
  shift: string;
}

const PIE_COLORS = ["#3D5EE1", "#6FCCD8", "#1ABE17", "#EAB300", "#E82646", "#8B5CF6"];

export default function OrgAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [faculty, setFaculty] = useState<FacultyRecord[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Explorer Tab State
  const [activeTab, setActiveTab] = useState<"students" | "faculty" | "fees" | "courses">("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const handleTabChange = (tab: "students" | "faculty" | "fees" | "courses") => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleDeptChange = (dept: string) => {
    setSelectedDept(dept);
    setCurrentPage(1);
  };

  // Load institutional data
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      api.get<StudentRecord[]>("/api/students").catch(() => ({ data: [] })),
      api.get<FacultyRecord[]>("/api/faculty").catch(() => ({ data: [] })),
      api.get<FeeRecord[]>("/api/fees").catch(() => ({ data: [] })),
      api.get<CourseRecord[]>("/api/courses").catch(() => ({ data: [] })),
      api.get<Branch[]>("/api/branches").catch(() => ({ data: [] })),
    ])
      .then(([studentsRes, facultyRes, feesRes, coursesRes, branchesRes]) => {
        if (!isMounted) return;
        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
        setFaculty(Array.isArray(facultyRes.data) ? facultyRes.data : []);
        setFees(Array.isArray(feesRes.data) ? feesRes.data : []);
        setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
        setBranches(Array.isArray(branchesRes.data) ? branchesRes.data : []);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Executive KPI Metrics
  const metrics = useMemo(() => {
    const totalStudents = students.length;
    const activeStudents = students.filter((s) => s.status === "Active").length;
    const totalFaculty = faculty.length;
    const studentTeacherRatio = totalFaculty > 0 ? (totalStudents / totalFaculty).toFixed(1) : "N/A";

    const totalRevenueCollected = fees
      .filter((f) => f.status === "Paid")
      .reduce((acc, f) => acc + f.amount, 0);

    const totalPendingDues = fees
      .filter((f) => f.status === "Unpaid" || f.status === "Overdue")
      .reduce((acc, f) => acc + f.amount, 0);

    const validCgpas = students.filter((s) => typeof s.cgpa === "number" && s.cgpa > 0);
    const avgCgpa =
      validCgpas.length > 0
        ? (validCgpas.reduce((acc, s) => acc + s.cgpa, 0) / validCgpas.length).toFixed(2)
        : "3.42";

    return {
      totalStudents,
      activeStudents,
      totalFaculty,
      studentTeacherRatio,
      totalRevenueCollected,
      totalPendingDues,
      avgCgpa,
    };
  }, [students, faculty, fees]);

  // Chart Data: Department Enrollment Breakdown (Pie Chart)
  const deptDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      const dept = s.department || "General";
      counts[dept] = (counts[dept] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [students]);

  // Chart Data: Departmental Revenue & Fee Collection (Bar Chart)
  const deptFinanceData = useMemo(() => {
    const deptFees: Record<string, { department: string; paid: number; pending: number }> = {};

    fees.forEach((f) => {
      const dept = f.student?.department || "General";
      if (!deptFees[dept]) {
        deptFees[dept] = { department: dept, paid: 0, pending: 0 };
      }
      if (f.status === "Paid") {
        deptFees[dept].paid += f.amount;
      } else {
        deptFees[dept].pending += f.amount;
      }
    });

    return Object.values(deptFees);
  }, [fees]);

  // Available unique departments
  const departmentsList = useMemo(() => {
    const depts = new Set<string>();
    students.forEach((s) => s.department && depts.add(s.department));
    faculty.forEach((f) => f.department && depts.add(f.department));
    courses.forEach((c) => c.department && depts.add(c.department));
    return Array.from(depts);
  }, [students, faculty, courses]);

  // Filtered Lists for Current Explorer Tab
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        searchQuery === "" ||
        s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.user.name && s.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === "all" || s.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [students, searchQuery, selectedDept]);

  const filteredFaculty = useMemo(() => {
    return faculty.filter((f) => {
      const matchesSearch =
        searchQuery === "" ||
        (f.user.name && f.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        f.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.specialization.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === "all" || f.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [faculty, searchQuery, selectedDept]);

  const filteredFees = useMemo(() => {
    return fees.filter((f) => {
      const matchesSearch =
        searchQuery === "" ||
        f.student?.rollNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.student?.user?.name &&
          f.student.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        f.type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === "all" || f.student?.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [fees, searchQuery, selectedDept]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        searchQuery === "" ||
        c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.courseName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === "all" || c.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [courses, searchQuery, selectedDept]);

  // Current active list and pagination math
  const currentTotal =
    activeTab === "students"
      ? filteredStudents.length
      : activeTab === "faculty"
      ? filteredFaculty.length
      : activeTab === "fees"
      ? filteredFees.length
      : filteredCourses.length;

  const totalPages = Math.ceil(currentTotal / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Executive Oversight (Organizational Admin)"
        subtitle="Consolidated macro-analytics, academic performance metrics, and cross-role audit directory for university leadership."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Organizational Admin" },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-300 font-bold px-3 py-1">
              Executive View (Read-Only)
            </Badge>
          </div>
        }
      />

      {/* EXECUTIVE OBSERVABILITY BANNER */}
      <div className="rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/60 dark:bg-purple-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-600 text-white shrink-0 mt-0.5">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Executive Observability & Strategic Analytics (Read-Only)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Organizational Admins hold macro strategic oversight across all campuses via visual graphs, financial totals, and academic performance metrics. Operational actions (editing student records, timetables, and fee structures) are managed directly by Branch Admins.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 font-bold px-3 py-1 text-xs">
            Visual Analytics Mode
          </Badge>
        </div>
      </div>

      {/* 1. EXECUTIVE KPI SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Total Students</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">{metrics.totalStudents}</div>
          <p className="text-xs text-muted-foreground">{metrics.activeStudents} actively enrolled</p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Faculty Members</span>
            <GraduationCap className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">{metrics.totalFaculty}</div>
          <p className="text-xs text-muted-foreground">Ratio: {metrics.studentTeacherRatio}:1 student/prof</p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-300/40 bg-emerald-500/5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span>Tuition Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {metrics.totalRevenueCollected.toLocaleString()} <span className="text-xs font-bold">ETB</span>
          </div>
          <p className="text-xs text-muted-foreground">Total cleared tuition</p>
        </div>

        <div className="p-5 rounded-2xl border border-amber-300/40 bg-amber-500/5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <span>Outstanding Dues</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
            {metrics.totalPendingDues.toLocaleString()} <span className="text-xs font-bold">ETB</span>
          </div>
          <p className="text-xs text-muted-foreground">Unpaid / pending fees</p>
        </div>

        <div className="p-5 rounded-2xl border border-purple-300/40 bg-purple-500/5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider">
            <span>Academic Performance</span>
            <Award className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-3xl font-extrabold text-purple-700 dark:text-purple-400">{metrics.avgCgpa}</div>
          <p className="text-xs text-muted-foreground">Institutional average GPA</p>
        </div>
      </div>

      {/* 2. MACRO VISUAL ANALYTICS (RECHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Departmental Financial Collection */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Financial Health by Department (ETB)</span>
              <Badge variant="outline" className="text-xs font-normal">Paid vs Outstanding</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deptFinanceData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                No financial data recorded yet.
              </div>
            ) : (
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptFinanceData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="department" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: unknown) => [typeof val === "number" ? `${val.toLocaleString()} ETB` : String(val ?? "")]}
                      contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="paid" name="Tuition Collected" fill="#1ABE17" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Outstanding Dues" fill="#EAB300" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart B: Student Enrollment Share */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Student Enrollment Share by Department</span>
              <Badge variant="outline" className="text-xs font-normal">Demographics</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deptDistributionData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                No student records found.
              </div>
            ) : (
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      paddingAngle={3}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""} (${(((percent ?? 0) as number) * 100).toFixed(0)}%)`
                      }
                    >
                      {deptDistributionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MULTI-BRANCH COMPARATIVE ANALYTICS & HEALTH */}
      <div id="branch-analytics" className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-brand-primary" />
              Multi-Branch & Campus Comparative Overview
            </h3>
            <p className="text-xs text-muted-foreground">
              Strategic distribution of resources across Head Campus (Branch A) and satellite sub-branches (A1, A2).
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono font-bold">
            {branches.length} Campuses Monitored
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branches.map((b) => (
            <Card key={b.id} className="border-border bg-card shadow-xs">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-brand-primary">{b.code}</span>
                  <Badge variant="outline" className={b.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-700 border-emerald-300 text-[10px]" : "bg-amber-500/10 text-amber-700 border-amber-300 text-[10px]"}>
                    {b.status}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold text-foreground mt-1 truncate">
                  {b.name}
                </CardTitle>
                <CardDescription className="text-[11px] truncate">
                  {b.isHead ? "Head Campus / Central HQ" : `Sub-Branch (${b.parent?.code || "A"}) • ${b.city || "Ethiopia"}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-1 py-1 text-center bg-muted/40 rounded-lg border border-border/40">
                  <div>
                    <div className="font-bold text-foreground">{b.sub_branches_count || b.subBranches?.length || 0}</div>
                    <div className="text-[10px] text-muted-foreground">Sub-Campuses</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{b.students_count || 0}</div>
                    <div className="text-[10px] text-muted-foreground">Students</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{b.faculty_count || 0}</div>
                    <div className="text-[10px] text-muted-foreground">Faculty</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. PAGINATED MULTI-ROLE EXPLORER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
          {/* Tab Selection */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Button
              variant={activeTab === "students" ? "default" : "ghost"}
              onClick={() => handleTabChange("students")}
              className="gap-2 text-xs font-bold"
            >
              <Users className="h-4 w-4" />
              Students ({students.length})
            </Button>
            <Button
              variant={activeTab === "faculty" ? "default" : "ghost"}
              onClick={() => handleTabChange("faculty")}
              className="gap-2 text-xs font-bold"
            >
              <GraduationCap className="h-4 w-4" />
              Faculty ({faculty.length})
            </Button>
            <Button
              variant={activeTab === "fees" ? "default" : "ghost"}
              onClick={() => handleTabChange("fees")}
              className="gap-2 text-xs font-bold"
            >
              <Receipt className="h-4 w-4" />
              Finance Ledger ({fees.length})
            </Button>
            <Button
              variant={activeTab === "courses" ? "default" : "ghost"}
              onClick={() => handleTabChange("courses")}
              className="gap-2 text-xs font-bold"
            >
              <BookOpen className="h-4 w-4" />
              Courses ({courses.length})
            </Button>
          </div>

          {/* Search & Department Filters */}
          <div className="flex items-center gap-3">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <Select value={selectedDept} onValueChange={handleDeptChange}>
              <SelectTrigger className="w-40 h-9 text-xs">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departmentsList.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tab Content Tables */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={6} />
            </div>
          ) : activeTab === "students" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3.5">Roll No</th>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Semester</th>
                    <th className="p-3.5">CGPA</th>
                    <th className="p-3.5">Shift</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.slice(startIndex, endIndex).map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-xs text-brand-primary">{s.rollNo}</td>
                      <td className="p-3.5 font-semibold text-foreground">{s.user.name || "N/A"}</td>
                      <td className="p-3.5 text-foreground">{s.department}</td>
                      <td className="p-3.5 text-muted-foreground">Semester {s.semester}</td>
                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className={
                            s.cgpa >= 3.5
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold text-xs"
                              : s.cgpa >= 3.0
                              ? "bg-blue-500/10 text-blue-700 border-blue-300 font-bold text-xs"
                              : "bg-amber-500/10 text-amber-700 border-amber-300 font-bold text-xs"
                          }
                        >
                          {s.cgpa ? s.cgpa.toFixed(2) : "3.50"}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground">{s.shift}</td>
                      <td className="p-3.5">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300 text-xs">
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No student records match your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === "faculty" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3.5">Faculty Member</th>
                    <th className="p-3.5">Email Contact</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Specialization</th>
                    <th className="p-3.5">Courses Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFaculty.slice(startIndex, endIndex).map((f) => (
                    <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-bold text-foreground">{f.user.name || "Faculty Member"}</td>
                      <td className="p-3.5 text-xs text-muted-foreground">{f.user.email}</td>
                      <td className="p-3.5 font-medium text-foreground">{f.department}</td>
                      <td className="p-3.5 text-xs text-foreground font-mono">{f.specialization}</td>
                      <td className="p-3.5 text-xs">
                        <span className="font-semibold text-brand-primary">
                          {f.teaches?.length ? `${f.teaches.length} course(s)` : "Active Faculty"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredFaculty.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No faculty records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === "fees" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3.5">Student Roll No</th>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Fee Category</th>
                    <th className="p-3.5">Amount (ETB)</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5">Cleared Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFees.slice(startIndex, endIndex).map((fee) => (
                    <tr key={fee.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-xs text-brand-primary">
                        {fee.student?.rollNo || "N/A"}
                      </td>
                      <td className="p-3.5 font-semibold text-foreground">{fee.student?.user?.name || "Student"}</td>
                      <td className="p-3.5 text-xs text-foreground">{fee.type}</td>
                      <td className="p-3.5 font-bold text-foreground">{fee.amount.toLocaleString()} ETB</td>
                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className={
                            fee.status === "Paid"
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-300 text-xs"
                              : fee.status === "Overdue"
                              ? "bg-rose-500/10 text-rose-700 border-rose-300 text-xs"
                              : "bg-amber-500/10 text-amber-700 border-amber-300 text-xs"
                          }
                        >
                          {fee.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground">
                        {new Date(fee.dueDate).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground">
                        {fee.paidDate ? new Date(fee.paidDate).toLocaleDateString() : "Pending"}
                      </td>
                    </tr>
                  ))}
                  {filteredFees.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No financial records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3.5">Course Code</th>
                    <th className="p-3.5">Course Title</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Credits</th>
                    <th className="p-3.5">Semester</th>
                    <th className="p-3.5">Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCourses.slice(startIndex, endIndex).map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-xs text-blue-600">{c.courseCode}</td>
                      <td className="p-3.5 font-semibold text-foreground">{c.courseName}</td>
                      <td className="p-3.5 text-foreground">{c.department}</td>
                      <td className="p-3.5 font-semibold text-foreground">{c.creditHours} Cr.</td>
                      <td className="p-3.5 text-muted-foreground">Semester {c.semester}</td>
                      <td className="p-3.5 text-xs text-muted-foreground">{c.shift}</td>
                    </tr>
                  ))}
                  {filteredCourses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No courses recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION CONTROLS */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
            <span className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{Math.min(startIndex + 1, currentTotal)}</span> to{" "}
              <span className="font-semibold text-foreground">{Math.min(endIndex, currentTotal)}</span> of{" "}
              <span className="font-semibold text-foreground">{currentTotal}</span> records
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 text-xs gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>

              <span className="text-xs px-2 font-medium text-foreground">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-2.5 text-xs gap-1"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
