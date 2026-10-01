# System Architecture: College Management Portal

This document outlines the technical architecture, data models, and core business logic for the College Management Portal. Refer to this before generating API routes, database queries, or UI components.

## 1. Technology Stack

* **Frontend:** Next.js (App Router), React, Tailwind CSS, ShadCN UI, ShadCN Charts (Recharts).
* **Backend:** Next.js Route Handlers (`app/api/*`) and Server Actions.
* **Database & ORM:** PostgreSQL managed via Prisma ORM.
* **Authentication & Identity:** Clerk.
* **Deployment:** Vercel.

## 2. System Layers Architecture

The application uses a unified, full-stack Next.js architecture:

1. **Presentation Layer (Frontend):** Handles interactivity, UI state, and data visualization. Uses ShadCN, Tailwind, and Framer Motion.
   * **Dashboard Shell:** Uses a unified `/dashboard` route with a `DashboardShell` layout component managing navigation and theming dynamically based on the active role.
   * **Mock Data Strategy:** Development uses centralized mock data (`src/lib/mock-data.ts`) bound to strict TypeScript models (`src/types/index.ts`) before APIs are integrated.
2. **Application Logic Layer (Next.js Server):** 
   * **Server Components:** Used for initial data fetching and rendering static UI securely on the server.
   * **Route Handlers (`app/api`):** Used for RESTful endpoints (e.g., webhook receivers from Clerk, complex mutations).
   * **Server Actions:** Used for direct form submissions and database mutations.
3. **Data Management Layer (Database):** PostgreSQL mapping relationships via Prisma ORM to guarantee data integrity.

## 3. Role-Based Access Control (RBAC) & Authentication

Security is handled via Clerk.

* **Authentication:** Clerk handles all login, signup, password resets, and session management. No passwords are stored in our Postgres database.
* **Session Management:** Clerk manages secure sessions.
* **Role Verification:** Roles (Student, Faculty, Admin) are stored in Clerk's `publicMetadata` or checked against the sync'd Postgres database via the user's `clerk_id`.
* **Route Protection:** Use Clerk middleware to protect standard routes. Use `auth()` or `currentUser()` inside API Routes and Server Actions to verify identity before executing logic.

## 4. Core Database Entities (Prisma)

* **Prisma Singleton:** Always import the Prisma client from a centralized singleton file (e.g., `lib/prisma.ts`) to prevent connection exhaustion during hot-reloading in development. Never instantiate `new PrismaClient()` directly inside a component or route.

* **User:** Base account (id [PK], clerk_id [Unique], name, email, role [Student/Faculty/Admin]).
* **Student:** Links to User (student_id [PK], user_id [FK], roll_no [Unique], department).
* **Faculty:** Links to User (faculty_id [PK], user_id [FK], specialization, department).
* **Admin:** Links to User (admin_id [PK], user_id [FK]).
* **Course:** (course_id, course_name, course_code [Unique], credit_hours, department, assignedFaculty).
* **Enrollment:** Maps Students to Courses (student_id, course_id, semester).
* **Attendance:** (attendance_id, student_id, course_id, date, status [Present/Absent/Late], markedBy).
* **Grade:** (grade_id, student_id, course_id, quiz_marks, assignment_marks, mid_marks, final_marks, total, faculty_id, locked_status).
* **Quiz & Question Bank:** Quizzes link to Courses. Questions belong to Quizzes. QuizAttempts track student scores.
* **Timetable:** (timetable_id, course_id, day, start_time, end_time, room).
* **Fee:** (fee_id, student_id, type, amount, status [Paid/Unpaid/Overdue], dueDate, semester).
* **Admission:** Tracks new student applications and generates Registration IDs.
* **Feedback:** Ratings/comments submitted by students for a target (faculty/course).
* **Announcement:** System notices targeted by role.

## 5. Critical Business Rules & Logic

When writing backend logic in Next.js, strictly enforce these rules:

### Clerk Syncing (Webhooks)
* Clerk webhook route (`/api/webhooks/clerk`) syncs `user.created`, `user.updated`, and `user.deleted` events to the Postgres `User` table.

### Security & Validations
* API routes must verify the Clerk session (`auth()`) and check permissions.

### Attendance Math
* Attendance cannot be marked for future dates.
* System must auto-calculate percentage on every update: `(Classes Present / Total Classes) * 100`. 

### Timetable Conflict Prevention
* Before saving a new timetable entry, check for conflicts.
* **Rule A:** A teacher cannot be assigned to two different classes at the exact same time slot.
* **Rule B:** A room cannot be booked for two different classes at the same time slot.

### Grading Constraints
* Lock Grade functionality must prevent any Faculty modification after lock.
* Grade revision/audit logging is planned backlog and not yet formalized.

### Quizzes
* Role-based authorization is enforced for quiz and question management routes.
* Fully server-enforced timer expiry auto-submit is planned backlog.

### QR Verification (Public Route) — Implemented
* Public page `GET /verify/[userId]` (Server Component) — renders a branded profile card for any user by their Postgres `User.id`. No login required.
* Public API `GET /api/verify/[userId]` — JSON endpoint returning the same safe data for external consumers.
* Each user can view and download (PNG) their personal QR code from **Dashboard → Settings**.
* **Safe data exposed:** Name, Role, Department, Roll No (student), Semester (student), Enrollment Date (student), Dues Status (student — Clear or Outstanding), Specialization (faculty), Join Date (faculty), Current Lecture (from timetable, if active), Institution Name.
* **Never exposed:** Email, phone, CNIC, grade details, attendance percentages, or financial amounts.
* Both `/verify/*` and `/api/verify/*` routes are explicitly excluded from Clerk auth in `src/proxy.ts`.

### Feedback Anonymization
* Current schema stores `studentId` for authorization/ownership checks.
* Anonymous display policy and duplicate-submission prevention are planned backlog items.