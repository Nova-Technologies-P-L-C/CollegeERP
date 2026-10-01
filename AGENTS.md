# Agent Instructions

## Package Manager
Use **bun**: `bun install`, `bun run dev`, `bun run build`

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: Claude Sonnet 4 <noreply@example.com>
```

## File-Scoped Commands
| Task | Command |
|------|---------|
| Typecheck | `bunx tsc --noEmit` |
| Lint | `bunx run lint` |

## Key Conventions
- **Framework:** Next.js (App Router), React Server Components first.
- **UI:** Tailwind CSS (v4), ShadCN UI, Framer Motion.
- **Charts:** Use **ShadCN Charts (Recharts)**. *Do not use Chart.js directly.*
- **Database:** Prisma ORM with PostgreSQL. Always import singleton from `lib/prisma.ts`.
- **Auth:** Clerk. Use `auth()` or `currentUser()` from `@clerk/nextjs/server` for server verification.
- **Typing:** Strict typing mandatory. Never use `any`.

## Domain Context (Read Before Modifying Scope)
- `.agent/prd.md` -> Feature requirements
- `.agent/architecture.md` -> System boundaries, RBAC, DB schemas
- `.agent/design.md` -> UI/UX tokens and specifications
- `.agent/status.md` -> Project completion status

## CLI
| Command | Description |
|---------|-------------|
| `bunx prisma studio` | Open Prisma Studio |
| `bunx prisma generate` | Generate Prisma Client |
| `bunx prisma migrate dev` | Run migrations |

## Domain Guidelines & Invariants
- **PDF Export / Print Styling**: Print pop-ups (`window.open`) must include `* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }` and use explicit HEX styles (`#ffffff`, `#1d4ed8`) for backgrounds, text, and borders so browsers preserve colors when saving to PDF.
- **Dynamic Grid Scaling**: Timetable grids must scale dynamically to the actual maximum entries across all active days (`Math.max(0, ...map[d].length)`) to prevent empty trailing rows.
- **Parent-Child Relation Cloning & Tab Invariants**:
  - When attaching existing child records (e.g. `Question`) to a new parent entity (`Quiz`), clone the child record if `quizId` is single-parent so past closed records maintain full history.
  - Never classify entity types or active tabs based on dynamic child counts (e.g., `_count.questions === 0`). Use explicit type/title metadata.
