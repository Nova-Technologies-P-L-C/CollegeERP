# Nova College ERP — Laravel 11 Backend

This is the dedicated REST API backend for the **Nova College ERP System**, replacing Next.js route handlers with standard Laravel Controllers, Eloquent Models, and Clerk JWT verification.

---

## Architecture Overview

* **Framework:** Laravel 11 (PHP 8.3)
* **Database:** PostgreSQL (Port 5433, database `mydb`)
* **Authentication:** Clerk JWT verification (`firebase/php-jwt`) via `ClerkAuthMiddleware`
* **RBAC:** Role guard middleware (`role:ADMIN`, `role:FACULTY`, `role:STUDENT`)
* **Frontend Connection:** Next.js proxies all `/api/*` requests directly to `http://127.0.0.1:8000/api/*` via `next.config.ts`

---

## Directory Structure

```text
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/   # REST API Controllers (Admissions, Courses, Grades, etc.)
│   │   └── Middleware/        # ClerkAuthMiddleware & RequireRoleMiddleware
│   ├── Models/                # Eloquent Models mapped to PostgreSQL tables
│   └── Services/              # ClerkService (JWKS verification) & AuditLogService
├── config/
│   └── services.php           # Clerk API configuration
├── routes/
│   └── api.php                # 84 active API routes
└── .env.example               # Environment template
```

---

## Getting Started

### 1. Install Dependencies
```bash
composer install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
php artisan key:generate
```

Ensure your PostgreSQL database credentials and Clerk keys match:
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5433
DB_DATABASE=mydb
DB_USERNAME=postgres
DB_PASSWORD=postgres

CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_FRONTEND_API=https://...
```

### 3. Run the Development Server
```bash
php artisan serve --port=8000
```

The API will be available at `http://127.0.0.1:8000/api/*`.
Health check: `http://127.0.0.1:8000/up`.
