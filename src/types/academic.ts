// ─── Academic Entities ───────────────────────────────────

export type ProgramLevel = "BS" | "INTERMEDIATE";

export interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  name: string; // alias for courseName, used in UI
  creditHours: number;
  department: string;
  assignedFaculty: string | null;
  enrolledCount: number;
  semester: number;
}

export interface Admission {
  id: string;
  studentName: string;
  email: string;
  phone: string;
  appliedDepartment: string;
  applicationDate: string;
  status: "Pending" | "Approved" | "Rejected";
  fatherName: string;
  cnic: string;
  previousInstitution: string;
  marksObtained: number;
  totalMarks: number;
}

export interface Timetable {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  facultyName: string;
  room: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | string;
  startTime: string;
  endTime: string;
  department: string;
  semester: number;
}

export type TimetableDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday";

export interface TimetableCourseSummary {
  courseCode: string;
  courseName: string;
  department: string;
  semester: number;
  faculty: { user: { name: string | null } } | null;
  facultyMorning?: { user: { name: string | null } } | null;
  facultyEvening?: { user: { name: string | null } } | null;
}

export interface TimetableApiEntry {
  id: string;
  courseId: string;
  room: string;
  day: TimetableDay;
  startTime: string;
  endTime: string;
  shift: string;
  course: TimetableCourseSummary;
}

export interface TimetableMutationInput {
  courseId: string;
  room: string;
  day: TimetableDay;
  startTime: string;
  endTime: string;
  shift: string;
}

// ─── Quiz & Question Bank ────────────────────────────────

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOption: number;
  courseId: string;
  createdBy: string;
}

export interface Quiz {
  id: string;
  title: string;
  courseId: string;
  createdBy: string;
  duration: number;
  totalMarks: number;
  questions: string[];
  status: "Draft" | "Published" | "Closed";
  dueDate: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  totalMarks: number;
  submittedAt: string;
  answers: number[];
}

// ─── Grade Breakdown ─────────────────────────────────────

export interface Grade {
  id: string;
  studentId: string;
  courseId: string;
  quizMarks: number;
  assignmentMarks: number;
  midMarks: number;
  finalMarks: number;
  total: number;
  gpa: number;
  locked: boolean;
}
