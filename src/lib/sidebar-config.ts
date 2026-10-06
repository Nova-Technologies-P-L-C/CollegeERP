import {
  LayoutDashboard,
  Users,
  Users2,
  GraduationCap,
  BookOpen,
  UserPlus,
  ClipboardCheck,
  CreditCard,
  MessageSquare,
  Calendar,
  MessageCircle,
  Settings,
  BarChart3,
  FileQuestion,
  PenTool,
  User,
  Shield,
  ShieldCheck,
  Building2,
  UserCheck,
  UserX,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

// ── Branch Admin (Client Campus Admin - Branch A): Full operational control ──
const adminNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Manage Sub-Branches", href: "/dashboard/branches", icon: Building2 },
  { title: "Manage Students", href: "/dashboard/students", icon: Users },
  { title: "Dropped Students", href: "/dashboard/left-students", icon: UserX },
  { title: "Alumni Directory", href: "/dashboard/alumni", icon: GraduationCap },
  { title: "Student Attendance", href: "/dashboard/attendance", icon: ClipboardCheck },
  { title: "Manage Faculty", href: "/dashboard/faculty", icon: GraduationCap },
  { title: "Faculty Attendance", href: "/dashboard/faculty-attendance", icon: UserCheck },
  { title: "Manage Courses", href: "/dashboard/courses", icon: BookOpen },
  { title: "Registrar Desk", href: "/dashboard/registrar", icon: UserPlus },
  { title: "Accountant Desk", href: "/dashboard/accountant", icon: CreditCard },
  { title: "Admissions Pipeline", href: "/dashboard/admissions", icon: Users },
  { title: "Manage Dues", href: "/dashboard/dues", icon: CreditCard },
  { title: "Announcements", href: "/dashboard/announcements", icon: MessageSquare },
  { title: "Timetable", href: "/dashboard/timetable", icon: Calendar },
  { title: "Feedback", href: "/dashboard/feedback", icon: MessageCircle },
  { title: "Audit Trail", href: "/dashboard/audit", icon: Shield },
  { title: "User Management", href: "/dashboard/users", icon: Users2 },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

// ── Organizational Admin (Executive / Board Oversight): Purely Read-Only Analytics & Graphs ──
const orgAdminNav: NavItem[] = [
  { title: "Executive Oversight", href: "/dashboard/org-admin", icon: BarChart3 },
  { title: "Branch Performance", href: "/dashboard/org-admin#branch-analytics", icon: Building2 },
  { title: "Alumni Directory", href: "/dashboard/alumni", icon: GraduationCap },
  { title: "Announcements", href: "/dashboard/announcements", icon: MessageSquare },
  { title: "Feedback Analytics", href: "/dashboard/feedback", icon: MessageCircle },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

// ── Platform Admin (Nova Technology - "We"): ERP Vendor & License Approvals ──
const platformAdminNav: NavItem[] = [
  { title: "Platform Overview", href: "/dashboard/platform-admin", icon: LayoutDashboard },
  { title: "Client Campuses", href: "/dashboard/platform-admin#licenses", icon: Building2 },
  { title: "Audit Trail", href: "/dashboard/audit", icon: ShieldCheck },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

// ── Academic Registrar Desk: Strictly Student Admissions & Enrolled Registry ──
const registrarNav: NavItem[] = [
  { title: "Registrar Desk", href: "/dashboard/registrar", icon: UserPlus },
  { title: "Admissions Pipeline", href: "/dashboard/admissions", icon: Users },
  { title: "Manage Students", href: "/dashboard/students", icon: Users2 },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

// ── Finance & Accountant Desk: Strictly Fee Clearance & Student Dues ──
const accountantNav: NavItem[] = [
  { title: "Accountant Desk", href: "/dashboard/accountant", icon: CreditCard },
  { title: "Manage Dues", href: "/dashboard/dues", icon: CreditCard },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

const facultyNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "My Classes", href: "/dashboard/classes", icon: BookOpen },
  { title: "Alumni Directory", href: "/dashboard/alumni", icon: GraduationCap },
  { title: "My Attendance", href: "/dashboard/faculty-attendance", icon: UserCheck },
  { title: "Mark Attendance", href: "/dashboard/mark-attendance", icon: ClipboardCheck },
  { title: "Manage Grades", href: "/dashboard/grades", icon: BarChart3 },
  { title: "Question Bank", href: "/dashboard/question-bank", icon: FileQuestion },
  { title: "Quizzes & Assignments", href: "/dashboard/quizzes", icon: PenTool },
  { title: "Feedback", href: "/dashboard/feedback", icon: MessageCircle },
  { title: "Profile", href: "/dashboard/settings", icon: User },
];

const studentNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "My Courses", href: "/dashboard/my-courses", icon: BookOpen },
  { title: "Alumni Directory", href: "/dashboard/alumni", icon: GraduationCap },
  { title: "Attendance", href: "/dashboard/my-attendance", icon: ClipboardCheck },
  { title: "Grades", href: "/dashboard/my-grades", icon: BarChart3 },
  { title: "Dues", href: "/dashboard/my-dues", icon: CreditCard },
  { title: "Timetable", href: "/dashboard/my-timetable", icon: Calendar },
  { title: "Quizzes & Assignments", href: "/dashboard/take-quiz", icon: PenTool },
  { title: "Feedback", href: "/dashboard/submit-feedback", icon: MessageSquare },
  { title: "Profile", href: "/dashboard/settings", icon: User },
];

export function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "platform_admin":
      return platformAdminNav;
    case "org_admin":
      return orgAdminNav;
    case "registrar":
      return registrarNav;
    case "accountant":
      return accountantNav;
    case "admin":
      return adminNav;
    case "faculty":
      return facultyNav;
    case "student":
      return studentNav;
    default:
      return studentNav;
  }
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "platform_admin":
      return "Platform Admin (Nova Tech)";
    case "org_admin":
      return "Organizational Admin";
    case "registrar":
      return "Academic Registrar";
    case "accountant":
      return "Finance & Accountant";
    case "admin":
      return "Branch Admin";
    case "faculty":
      return "Faculty Member";
    case "student":
      return "Student";
    default:
      return "User";
  }
}

