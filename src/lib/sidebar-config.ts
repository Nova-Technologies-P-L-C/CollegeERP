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

const adminNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Manage Students", href: "/dashboard/students", icon: Users },
  { title: "Dropped Students", href: "/dashboard/left-students", icon: UserX },
  { title: "Alumni Directory", href: "/dashboard/alumni", icon: GraduationCap },
  { title: "Student Attendance", href: "/dashboard/attendance", icon: ClipboardCheck },
  { title: "Manage Faculty", href: "/dashboard/faculty", icon: GraduationCap },
  { title: "Faculty Attendance", href: "/dashboard/faculty-attendance", icon: UserCheck },
  { title: "Manage Courses", href: "/dashboard/courses", icon: BookOpen },
  { title: "Admissions", href: "/dashboard/admissions", icon: UserPlus },
  { title: "Manage Dues", href: "/dashboard/dues", icon: CreditCard },
  { title: "Announcements", href: "/dashboard/announcements", icon: MessageSquare },
  { title: "Timetable", href: "/dashboard/timetable", icon: Calendar },
  { title: "Feedback", href: "/dashboard/feedback", icon: MessageCircle },
  { title: "Audit Trail", href: "/dashboard/audit", icon: Shield },
  { title: "User Management", href: "/dashboard/users", icon: Users2 },
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
    case "admin":
      return "Administrator";
    case "faculty":
      return "Faculty Member";
    case "student":
      return "Student";
    default:
      return "User";
  }
}
