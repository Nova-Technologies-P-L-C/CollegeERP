// ─── Dashboard, Fee, Attendance & UI Entities ───────────────

import React from "react";

export interface Attendance {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  status: "Present" | "Absent" | "Late";
  markedBy: string;
}

export interface Fee {
  id: string;
  studentId: string;
  type: string;
  feeType: string; // alias for type, used in UI
  amount: number;
  status: "Paid" | "Unpaid" | "Overdue";
  dueDate: string;
  semester: number;
  paidDate: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  audience: "Students" | "Faculty" | "All";
  priority: "High" | "Medium" | "Low";
}

export interface Feedback {
  id: string;
  studentId: string;
  submittedBy: string; // alias for studentId, used in UI
  type: "Faculty" | "Course";
  targetId: string; // The ID of the faculty or course
  rating: number;
  comment: string;
  date: string;
}

// ─── Analytics / Dashboard Stats ─────────────────────────

export interface DashboardStat {
  title: string;
  value: string | number;
  trend: string;
  trendDirection: "up" | "down";
  icon: string;
  color: string;
}

// ─── Sidebar Navigation ─────────────────────────────────

export interface SidebarItem {
  title: string;
  href: string;
  icon: string;
  badge?: number;
}

// ─── Data Table ──────────────────────────────────────────

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}
