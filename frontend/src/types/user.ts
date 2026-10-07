// ─── User Roles & Profile Entities ─────────────────────────

export type UserRole =
  | "admin"
  | "faculty"
  | "student"
  | "org_admin"
  | "platform_admin"
  | "registrar"
  | "accountant";

export type AdminType = "PLATFORM_ADMIN" | "BRANCH_ADMIN" | "ORG_ADMIN" | "REGISTRAR" | "ACCOUNTANT";

export type BranchStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface Branch {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  status: BranchStatus;
  approvedAt?: string | null;
  approvedBy?: string | null;
  isHead: boolean;
  parentId?: string | null;
  parent?: Branch | null;
  subBranches?: Branch[];
  sub_branches?: Branch[];
  sub_branches_count?: number;
  students_count?: number;
  faculty_count?: number;
  courses_count?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  email: string;
  phone: string;
  department: string;
  semester: number;
  enrollmentDate: string;
  avatar?: string;
  branchId?: string | null;
}

export interface Faculty {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  specialization: string;
  joinDate: string;
  avatar?: string;
  branchId?: string | null;
}

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  branchId?: string | null;
  branch?: Branch | null;
}

