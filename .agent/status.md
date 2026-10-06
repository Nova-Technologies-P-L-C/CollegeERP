# Project Status

## Overview
As of 2026-10-05, the project has been fully decoupled into a **Next.js 16 (App Router)** frontend and a standalone **Laravel 11 (PHP 8.3)** REST API backend. Legacy Next.js route handlers and unused Clerk dependencies have been removed. All 96+ API endpoints are served via Laravel Sanctum, and all 39 Next.js pages compile cleanly.

## What's Done

### Architecture & Backend Migration (Laravel 11)
- **Standalone REST API:** Complete Laravel 11 API located in `backend/` with PostgreSQL connection.
- **Authentication:** Laravel Sanctum token-based authentication with personal access tokens and drop-in `SanctumAuthContext` for the frontend.
- **Controller & Route Parity:**
  - `AuthController`: login, register, reset-password, logout, me, updateProfile.
  - `DashboardController`: admin, faculty, student aggregated analytics.
  - `CourseController` & `ImportController`: full course CRUD and CSV bulk import.
  - `StudentController`: student profiles, promote, left/dropped student management.
  - `FacultyController`: faculty profiles, attendance history, and admin attendance override (`POST /api/faculty/attendance/admin`).
  - `AdmissionController`: applicant processing, status tracking, CSV applicant import.
  - `AttendanceController`: daily attendance marking, duplicate-day guard, and percentage calculation.
  - `GradeController`: grade entry, GPA computation, and admin grade lock toggle.
  - `FeeController`: fee generation, dues tracking, and overdue status detection.
  - `TimetableController`: schedule slots, conflict detection (faculty & room clashes), `batch` slot creation, and `auto-generate` scheduler.
  - `QuizController` & `QuestionController`: assessments, question bank, and student attempt submission.
  - `AnnouncementController` & `FeedbackController`: institution-wide notices and student feedback.
  - `AuditLogController`: audit logging on all mutations with actor attribution.
  - `SettingsController`: admin onboarding secret generation and expiration checks (`/api/settings/admin-secret`).
  - `VerifyController`: public identity verification for student/faculty/staff cards.
  - `UserController`: administrator user management and role assignment.

### Frontend Modernization & Cleanup
- **Pruned Dead Code:**
  - Removed obsolete Next.js route handlers (`src/app/api/`).
  - Removed dead service wrappers (`src/lib/services/`, `src/lib/auth-guard.ts`, `src/lib/auth-cache.ts`, `src/lib/api-errors.ts`, `src/lib/audit-log.ts`, `src/lib/sync-hooks.ts`, `src/lib/timetable-csp.ts`, `src/utils/roles.ts`).
  - Pruned `@clerk/nextjs`, `@clerk/themes`, `@clerk/shared`, and `svix` from `package.json` and updated `bun.lock`.
- **API Proxy:** Next.js proxies all `/api/*` requests directly to `http://127.0.0.1:8000/api/*` via `next.config.ts`.
- **Server Verification:** Added `fetchLaravelMe` in `src/lib/laravel.ts` for fast server-component session authentication across dashboard pages.

### Academic Program Level Isolation & Corrections (All 9 Items Completed)
All items documented in `CorrectionsNotes.md` have been fully implemented across frontend and backend:
1. **Default Discipline (F.Sc Pre-Engineering):** Fixed default dropdown states in `students`, `courses`, `attendance`, and `dues` pages to prevent empty selections.
2. **Intermediate Student Card in Manage Students:** Student detail modal dynamically hides BS-only fields (`Semester`, `Shift`, `Department`) and renders `Discipline`, `Part`, and `Subject Set` for Intermediate students.
3. **Alumni Directory Isolation:** Backend `AlumniController` strictly separates BS (`status = 'Graduated'`) and Intermediate (`status in ['HSSC Completed', 'Graduated']`). Frontend hides CGPA and shift badges for Intermediate, displaying the "HSSC Completed" badge.
4. **Intermediate Manage Courses:** Updated `CourseController` index and store to cleanly map `discipline` and `part` when `programLevel === 'INTERMEDIATE'`.
5. **Manage Dues Defaults & Bulk Generation:** Frontend includes `programLevel` in bulk fee creation and adapts term labels ("Part X", no Shift). Backend scopes fee assignment to students matching discipline and part without shift restrictions.
6. **Announcements Isolation:**
   - Frontend: `DashboardHeader`, `announcements/page.tsx`, `notifications/page.tsx`, and `attendance/page.tsx` pass `programLevel`, discipline/dept, and part/sem.
   - Backend: `AnnouncementController` isolates student views by their enrolled program level, and admins/faculty by query parameter.
7. **Feedback BS vs Intermediate Isolation:**
   - Backend: `FeedbackController` strictly filters feedback by student `programLevel` and restricts student queries to their own submissions.
   - Frontend: `feedback/page.tsx` and `DashboardShell` unread counters scope queries dynamically to the active `programLevel`.
8. **Audit Trail Isolation:**
   - Backend: `AuditLogController` strictly isolates logs by `programLevel` (with action and entity filters).
   - Frontend: `audit/page.tsx` dynamically displays "Intermediate (HSSC) Audit Trail" vs "BS Programs Audit Trail", resets filters on toggle, and shows program-level badges.
9. **User Management BS vs Intermediate Isolation:**
   - Backend: `UserController` indexes students strictly by `programLevel`, `department`/`discipline`, and `semester`/`part`.
   - Frontend: `UserManagementClient` provides dynamic headers ("Discipline & Part / Roll"), formats terms as "Part X" for Inter, and sanitized old Clerk references in deletion dialogs.

### Role-Based Access Control (RBAC) & Admissions Workflow Merge (2026-10-06)
- **Database & Prisma Schema:**
  - Expanded PostgreSQL `AdminType` enum to include `REGISTRAR` and `ACCOUNTANT`.
  - Updated `prisma/schema.prisma` with `REGISTRAR` and `ACCOUNTANT` and regenerated Prisma client.
  - Updated `src/types/user.ts` to include `REGISTRAR` and `ACCOUNTANT`.
- **Backend Route Protection (`RequireRoleMiddleware.php` & `api.php`):**
  - Updated `RequireRoleMiddleware` to inspect `user->admin->adminType` for granular permission enforcement:
    - `REGISTRAR`: Exclusively authorized for `POST /api/admissions`, `GET /api/admissions`, `GET /api/students`, `PATCH /api/students/{id}`. Blocked from fee collection, course management, and administrative user controls.
    - `ACCOUNTANT`: Exclusively authorized for `PATCH /api/admissions/{id}` (fee verification & activation), `GET /api/fees`, `POST /api/fees`, `PATCH /api/fees/{id}`. Blocked from academic and registration actions.
    - `BRANCH_ADMIN` & `PLATFORM_ADMIN`: Retain campus-wide administrative control across all domains.
    - `FACULTY`: Scoped strictly to their classes, student roll-call, and grading.
    - `STUDENT`: Read-only access to their own grades, attendance, timetable, and dues.
- **2-Step Registration & Auto-Enrollment Pipeline:**
  - Step 1: Registrar enters student at `/dashboard/registrar` $\rightarrow$ application queued as *Pending* $\rightarrow$ official print slip generated.
  - Step 2: Applicant presents slip to Accountant $\rightarrow$ Accountant verifies cash/CBE/Telebirr receipt at `/dashboard/accountant` and clicks *Clear & Enrol* $\rightarrow$ generates active Roll Number (e.g. `ICO-2026-01`), activates paid fee record, and automatically enrolls student in all required course subjects for their discipline and semester/part.
  - Faculty Roll-Call: Once enrolled, students immediately appear in `/dashboard/mark-attendance` and `/dashboard/grades` for faculty members under their respective program level (BS vs Intermediate HSSC).
- **Navigation & UI Role Scoping:**
  - `src/lib/sidebar-config.ts`: Cleaned up role sidebars (`registrarNav`, `accountantNav`, `facultyNav`, `adminNav`).
  - `src/app/dashboard/layout.tsx` & `src/app/dashboard/page.tsx`: Seamlessly routes incoming logins to their respective specialized desks (`/dashboard/registrar`, `/dashboard/accountant`, etc.).
  - `src/app/dashboard/users/UserManagementClient.tsx`: Shows explicit role badges (`Branch Admin`, `Registrar`, `Accountant`, `Platform Admin`, `Org Admin`, `Faculty`, `Student`) with accurate styling.

### Payment Verification Before Admission Approval & Bulk Dues Assignment Fixes (2026-10-06)
- **Strict Payment Verification Enforcement:**
  - `backend/app/Http/Controllers/Api/AdmissionController.php`: Updated `update` to strictly require `receiptNo` and positive `paidAmount` before status can be transitioned to `Approved`. Attempting to approve an admission without payment clearance is rejected with HTTP 422.
  - `src/app/dashboard/admissions/page.tsx`:
    - Removed unverified 1-click approve button on Pending applications; replaced with "Verify Fee" button linking to `/dashboard/accountant`.
    - Added warning notice in admission detail dialog: "Awaiting Accountant Payment Clearance". Replaced direct approve button with "Clear at Accountant Desk".
    - Blocked bulk approval on student admissions; guided users to Accountant Desk for individual receipt-verified clearance.
  - `src/app/student-setup/page.tsx`: Clarified applicant review screen to reflect that admission fees must be verified by the accountant before enrollment activates.
- **Accountant Manage Dues & Bulk Class Fee Assignment:**
  - `backend/routes/api.php`: Added `ACCOUNTANT` to `Route::get('/students')->middleware('role:ADMIN,REGISTRAR,FACULTY,ACCOUNTANT')` so the accountant can load student rosters in the Manage Dues dashboard.
  - `backend/app/Http/Controllers/Api/FeeController.php`:
    - Fixed bulk fee student querying for Intermediate programs to normalize disciplines (`ICS`, `I.Com`, `FA`, `F.Sc`) and match `part` or `semester`.
    - Added guard against empty classes: returns descriptive HTTP 422 error if no active students match the selected class/shift.
    - Added duplicate unpaid fee prevention for the same semester.
  - `src/app/dashboard/dues/page.tsx`:
    - Updated `StudentItem` interface with `discipline`, `part`, `programLevel`.
    - Enhanced `classStudents` filtering for Intermediate disciplines and terms.
    - Added real-time success notification banner indicating the number of students assigned dues.

### Build & Quality Verification
- `bunx tsc --noEmit` — ✅ Zero errors
- `bun run lint` (ESLint) — ✅ Zero errors, zero warnings across all frontend routes and components
- `bun run build` — ✅ Exit code 0 (all 46 routes compile successfully)
- Laravel API Tests — ✅ phpunit passed, tinker verified payment guard (HTTP 422 without receipt, HTTP 200 with receipt) and bulk fee matching for Intermediate/BS.

## Next Steps
- End-to-end user acceptance testing across demo accounts for all roles (Admin, Faculty, Student, Alumni, Accountant, Registrar).
