# College Management Portal - Summary of whole project

**Version:** 1.0  
**Institution:** Govt. Graduate College, Hafizabad  
**Affiliated With:** University of the Punjab, Lahore  
**Department:** Computer Science  
**Project Advisor:** Prof. Waheed Hassan  
**Team:**

| Name | Roll No | Registration No |
|---|---|---|
| Ali Abbas Chadhar | 092899 | 2022-GCH-47 |
| Waqar-Ul-Hassan | 092935 | 2022-GCH-59 |
| Abu Hurairah | 092895 | 2022-GCH-66 |

**Academic Batch:** BSCSF2022-2026  
**Project Timeline:** October 2025 – June 2026

---

## 1. Project Overview

### 1.1 Background
Most educational institutions in Pakistan still rely on manual, paper-based academic administration — leading to attendance errors, delayed grade access, scheduling conflicts, and lack of financial transparency. The **College Management Portal** is a centralized web application built to digitize and automate these workflows.

### 1.2 Problem Statement
- Student attendance tracked on paper registers causes data loss and calculation errors.
- Students cannot access grades or attendance until end of semester.
- Manual GPA/result calculation is error-prone.
- Scheduling conflicts arise from manual timetable creation.
- No digital dues/fee transparency for students or administration.

### 1.3 Solution
A role-based, web-based platform connecting **Students**, **Faculty**, and **Admins** in a unified ecosystem. The system automates attendance, grading, timetable generation, quiz management, admissions, dues tracking, and QR-based identity verification.

### 1.4 Platform
- **Type:** Web Application (browser-based, no mobile app in this version)
- **Deployment:** Vercel (free tier)
- **Access:** Via standard browsers — Chrome, Firefox, Safari

---

## 2. Goals & Objectives

### 2.1 High-Level Goals
| Goal | Description |
|---|---|
| Digital Transformation | Replace all manual paper-based academic processes with digital workflows |
| Centralized Management | Single platform for students, faculty, and admins |
| Efficiency & Transparency | Automate calculations; provide real-time data access |
| Data-Driven Decision Making | Analytics dashboards with live charts and reports |
| Improved Learning Experience | Students see grades, attendance, schedules in real time |
| QR-Based Identity | Instant student profile access via QR code on student card |

---

## 3. System Architecture

The system follows a unified Next.js architecture:

```
[ Presentation Layer ]   →   Next.js (React) + ShadCN + Recharts (via ShadCN Charts)
        ↓
[ Application Logic ]    →   Next.js API Routes + Server Actions
        ↓
[ Data Management ]      →   PostgreSQL + Prisma ORM + Clerk Auth
```

---

## 4. Technology Stack

| Category | Technology | Purpose |
|---|---|---|
| Programming Language | TypeScript | Primary language for all layers |
| Frontend Framework | Next.js (App Router) | UI framework |
| UI Components | ShadCN, TailwindCSS | Pre-styled, responsive components |
| Data Visualization | Recharts (via ShadCN Charts) | Analytics charts and graphs |
| Backend API | Next.js API Routes | REST API endpoints & webhooks |
| Authentication | Clerk | Identity, Sign-in, User Management |
| ORM | Prisma | Database abstraction layer |
| Database | PostgreSQL | Primary data store |
| Deployment | Vercel (Free Tier) | Full-stack deployment |

---

## 5. User Roles

1. **Student:** End-user of academic data. Read-only profile. Can view grades, attendance, timetable, dues. Can attempt online quizzes.
2. **Faculty (Teacher):** Instructor managing classes. Marks attendance, creates quizzes, uploads marks. Cannot modify grades after Admin locks them.
3. **Admin:** Super-user with full system access. Manages users, admissions, courses, timetables, fee structures, and announcements. Can lock grades.

---

## 6. Functional Requirements

| Requirement | Description | Status (2026-04-09) |
|---|---|---|
| **FR-01 — User Login & Authentication** | Register, log in, recover passwords securely via **Clerk**. | **Implemented** |
| **FR-02 — Role-Based Access Control (RBAC)** | Strict access boundaries based on user role (Clerk session + app role checks). | **Implemented** |
| **FR-03 — Smart Attendance Tracking** | Faculty digital attendance marking, auto-calculated percentages. | **Implemented (core)** |
| **FR-04 — Automated Timetable Generation** | Conflict-free weekly schedule generation. | **Partially Implemented** (conflict checks exist; auto-generation workflow not finalized) |
| **FR-05 — Online Quiz & Question Bank** | Centralized question bank, auto-graded online quizzes. | **Implemented (core)** |
| **FR-06 — Dues & Fee Management** | Admin manages fees, students view dues status. | **Implemented (core)** |
| **FR-07 — Grading & Results Management** | Faculty inputs marks -> auto calculation of GPA/percentage. | **Implemented (core)** |
| **FR-08 — Digital Admission System** | Admins process new student applications (Registration IDs & CSV imports). | **Partially Implemented** (admissions API present; CSV import backlog) |
| **FR-09 — Student QR Verification** | QR code scanned reveals basic public profile without login. | **Implemented** |

---

## 7. Non-Functional Requirements

* **Performance:** Dashboard pages load within 2 seconds.
* **Scalability:** Handle concurrent logins during peak times.
* **Security:** Strict RBAC, HTTPS, Clerk security suite.
* **Reliability:** 100% mathematical accuracy for grades and attendance.
* **Compatibility:** Chrome, Firefox, Safari support at 720p to 1080p resolution.

---

## 8. Database Entities (PostgreSQL via Prisma)

* **User**: id, clerkId, name, email, role. (Identity synced from Clerk)
* **Student**, **Faculty**, **Admin**: linked to User by userId.
* **Course**, **Enrollment**: Manage academics and student-course links.
* **Attendance**, **Grade**, **Fee**, **Timetable**: Academic records.
* **Quiz**, **Question**, **QuizAttempt**: Assessments.
* **Feedback**, **Announcement**, **Admission**: Ecosystem tools.

---

## 9. API Behaviour & Business Rules

* API protected via Clerk `auth()` checks on Next API Routes.
* RBAC enforced in Next middleware and server actions.
* Arithmetic calculations for GPA, attendance auto-executed accurately.
* Timetable conflicting saves rejected with `409 Conflict`.
* Student public QR route (`/verify/:registrationId`) is planned/backlog and not yet implemented.

---

## 10. Project Timeline & Cost

* Timeline: October 2025 to June 2026.
* Estimated Size: 10,500 LOC.
* Delivery milestone: Final Submission & Defense by June 19, 2026.