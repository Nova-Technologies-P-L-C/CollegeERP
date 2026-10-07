<p align="center">
	<img src="frontend/public/logo.svg" alt="Nova Technology ERP logo" width="220" />
</p>

# Nova Technology — ERP Portal

A full-stack, role-based college ERP built with Next.js App Router (frontend), Laravel 11 (backend), Clerk, Prisma/Eloquent, and PostgreSQL. It centralizes attendance, grades, fees, timetable, quizzes, admissions, announcements, and public QR profile verification for Students, Faculty, and Admins.

This project is built and maintained by **Nova Technology**.

## Key Features

- Role-based dashboards and navigation for Student, Faculty, and Admin
- Clerk-powered authentication with role checks in protected routes and APIs
- PostgreSQL database shared between Next.js and Laravel Eloquent / Prisma
- Attendance management with duplicate-day constraints
- Grade workflows with lock support
- Fee/dues visibility for students and administration
- Course, enrollment, timetable, quiz, and question management
- Public profile verification via QR code routes
- Webhook-based Clerk user sync into local database

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, ShadCN UI, Framer Motion, Bun
- **Backend:** Laravel 11 (PHP 8.3), Eloquent ORM, Composer
- **Auth:** Clerk (JWT verification via JWKS)
- **Database:** PostgreSQL (shared)
- **Charts:** Recharts (ShadCN chart patterns)

## Project Structure

```text
.
├── frontend/                  # Next.js App Router client application
│   ├── prisma/                # Prisma schema, migrations, seeders
│   ├── public/                # Static assets & logos
│   ├── src/
│   │   ├── app/               # Next.js pages and layouts
│   │   ├── components/        # UI & Dashboard components
│   │   ├── context/           # React context providers
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities, axios client, constants
│   │   └── types/             # TypeScript definitions
│   ├── package.json
│   ├── next.config.ts         # Proxies /api/* to Laravel backend (http://127.0.0.1:8000)
│   └── tsconfig.json
├── backend/                   # Laravel 11 REST API backend
│   ├── app/
│   │   ├── Http/Controllers/ # REST API controllers
│   │   ├── Middleware/       # ClerkAuth & Role middlewares
│   │   ├── Models/           # Eloquent models
│   │   └── Services/         # Clerk & core services
│   ├── config/
│   ├── database/             # Migrations & seeders
│   ├── routes/api.php        # REST API endpoints
│   ├── composer.json
│   └── artisan
├── docker-compose.yaml        # PostgreSQL database service
├── AGENTS.md                  # Development instructions & guidelines
└── README.md
```

## Architecture Overview

### High-Level Layers

```text
Presentation Layer
	Next.js pages/components + Tailwind/ShadCN + motion

Application Layer
	Next.js Route Handlers under src/app/api/*
	Clerk auth checks + role validation

Data Layer
	Prisma ORM + PostgreSQL
	Prisma singleton (src/lib/prisma.ts)
```

### Auth and RBAC

- Clerk manages identity/session.
- App routes are gated in src/proxy.ts.
- Role is resolved from Clerk session metadata.
- API handlers validate auth and enforce role-specific access.
- Public routes excluded from auth:
	- /verify/*
	- /api/verify/*
	- /api/webhooks/*

### QR Profile Verification

- Public UI route: GET /verify/[userId]
- Public API route: GET /api/verify/[userId]
- Safe fields are exposed for identity verification use-cases.
- Sensitive fields are intentionally excluded (email, phone, CNIC, marks detail, attendance detail, fee amounts).

## Domain Model Summary

Primary Prisma models:

- User, Student, Faculty, Admin
- Course, Enrollment, Timetable
- Attendance, Grade, Fee
- Quiz, Question, QuizAttempt
- Admission, Feedback, Announcement

Important constraints:

- Enrollment is unique on [studentId, courseId]
- Attendance is unique on [studentId, courseId, date]
- User has unique clerkId and email
- Role enum: STUDENT, FACULTY, ADMIN

## API Surface (Route Groups)

Route handlers live under src/app/api.

- /api/admissions
- /api/announcements
- /api/attendance
- /api/courses
- /api/dashboard/{admin|faculty|student}
- /api/faculty
- /api/feedback
- /api/fees
- /api/grades
- /api/me
- /api/questions
- /api/quizzes
- /api/students
- /api/timetable
- /api/verify/[userId] (public)
- /api/webhooks/clerk (public webhook receiver)

## Prerequisites

- Node.js 20+
- Bun 1.1+
- PostgreSQL 15+
- Clerk application (development instance is enough)

## Quick Start

### 1. Clone and install dependencies

```bash
git clone <your-repository-url>
cd college-management-portal-fyp
bun install
```

### 2. Configure environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

If you do not have .env.example in your clone, create .env.local manually.

Set at minimum:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME

# Clerk (required by Next.js app runtime)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Clerk webhook (one of these is required by /api/webhooks/clerk)
CLERK_WEBHOOK_SIGNING_SECRET=whsec_xxx
# or
CLERK_WEBHOOK_SECRET=whsec_xxx
```

Notes:

- DATABASE_URL is required by Prisma client and seed script.
- The webhook route throws on startup call if webhook secret is missing.
- In Clerk, add role metadata (student, faculty, admin) to drive RBAC behavior.

### 3. Generate Prisma client and run migrations

```bash
bunx prisma generate
bunx prisma migrate dev
```

### 4. Seed demo data (optional but recommended)

```bash
bunx prisma db seed
```

### 5. Start development server

```bash
bun run dev
```

Open http://localhost:3000.

## Local Development Workflow

### Common commands

```bash
# Dev server
bun run dev

# Production build
bun run build

# Start production build locally
bun run start

# Lint (project convention)
bunx next lint

# Typecheck
bunx tsc --noEmit

# Prisma Studio
bunx prisma studio
```

### Database sanity check

```bash
bun check-db.ts
```

This script prints record counts for key entities.

## Clerk Setup Notes

### Required Clerk configuration

1. Enable sign-in/sign-up for your desired providers.
2. Configure a webhook endpoint pointing to:

```text
https://<your-domain>/api/webhooks/clerk
```

3. Subscribe to events:
	 - user.created
	 - user.updated
	 - user.deleted
4. Put the webhook signing secret in CLERK_WEBHOOK_SIGNING_SECRET (or CLERK_WEBHOOK_SECRET).

### Role metadata

The app resolves role from session metadata. Use lowercase role values in Clerk public metadata:

- student
- faculty
- admin

## Deployment

Primary target is Vercel.

### Vercel checklist

1. Connect repository to Vercel.
2. Add environment variables in Vercel project settings:
	 - DATABASE_URL
	 - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
	 - CLERK_SECRET_KEY
	 - CLERK_WEBHOOK_SIGNING_SECRET (or CLERK_WEBHOOK_SECRET)
3. Ensure your PostgreSQL instance allows Vercel network access.
4. Run migrations during release process:

```bash
bunx prisma migrate deploy
```

5. Update Clerk webhook URL to your production domain.

## Security and Privacy Notes

- Public verification routes return only safe identity fields.
- Sensitive academic/financial detail is excluded from public responses.
- Protected dashboard and data operations require authenticated Clerk sessions.
- RBAC route guards redirect unauthorized dashboard access to permitted areas.

## Troubleshooting

### Prisma connection issues

- Validate DATABASE_URL.
- Ensure PostgreSQL is running and reachable from your environment.
- Re-run:

```bash
bunx prisma generate
bunx prisma migrate dev
```

### Webhook verification errors

- Confirm CLERK_WEBHOOK_SIGNING_SECRET value matches Clerk dashboard secret.
- Ensure svix-* headers are present on incoming webhook requests.

### Role-based page redirects not working as expected

- Confirm Clerk user metadata has correct role value.
- Sign out and sign in again to refresh claims.
- Verify allowed route lists in src/proxy.ts.

## Current Status Snapshot

Core modules are implemented and functional in the current codebase, including attendance, grades, fees, timetable management, quizzes, admissions APIs, announcements, feedback, dashboard views, Clerk sync webhook, and QR profile verification.

See .agent/status.md and docs/plans for evolving implementation notes.

## Contributing

1. Create a branch.
2. Implement and verify changes.
3. Run lint and typecheck.
4. Open a pull request with scope, screenshots (if UI), and test notes.

---

If you want, this README can be extended with:

- Full endpoint-by-endpoint request and response examples
- Sequence diagrams for auth, webhook sync, and verification flow
- Seeded demo personas and test walk-through scenarios
