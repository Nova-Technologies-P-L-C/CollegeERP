// ─── User Roles & Profile Entities ─────────────────────────

export type UserRole = "admin" | "faculty" | "student";

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
}

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
}
