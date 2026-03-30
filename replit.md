# LMS Academy

## Overview

Full-featured Learning Management System (LMS) built as a pnpm monorepo with TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Frontend**: React + Vite + TailwindCSS v4 + shadcn/ui
- **Auth**: JWT (bcryptjs), email/password, Google OAuth hooks
- **Email**: Resend

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (all routes)
│   └── lms/                # React + Vite frontend (served at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema (lib/db/src/schema/)

- `users.ts` — users table + password_reset_tokens
- `courses.ts` — courses (+ `payment_link` nullable), sections, lessons, `course_enquiries`
- `enrollments.ts` — enrollments + progress tracking
- `orders.ts` — orders with payment gateway fields
- `live-sessions.ts` — scheduled live/Zoom sessions
- `community.ts` — community posts per course
- `affiliates.ts` — affiliate tracking
- `webinars.ts` — webinars + `webinar_rsvps` table

## API Routes (artifacts/api-server/src/routes/)

- `auth.ts` — register, login, logout, /me, forgot/reset password
- `users.ts` — CRUD + password change (RBAC: owner/instructor/student)
- `courses.ts` — CRUD + sections + lessons (nested) + `POST /:courseId/enquiries` (student-only)
- `enrollments.ts` — create, list, revoke
- `progress.ts` — mark lesson complete, get progress
- `orders.ts` — CRUD + mark-paid (auto-enrolls)
- `live-sessions.ts` — schedule and manage live sessions
- `community.ts` — posts CRUD
- `analytics.ts` — owner/instructor summary dashboard
- `affiliates.ts` — affiliate code management
- `webinars.ts` — webinar CRUD, RSVP (student POST/DELETE), admin RSVP list
- `enquiries.ts` — list all course enquiries (admin only, GET /api/enquiries)
- `site-settings.ts` — site title, logo URL

## Frontend Pages (artifacts/lms/src/pages/)

- `public/Landing.tsx` — marketing homepage
- `public/CourseCatalog.tsx` — public course browser
- `public/CourseLanding.tsx` — per-course marketing page with smart CTA (enrolled→Go to Course, paid+Razorpay link→open link, else→enquiry form)
- `auth/Login.tsx` — email/password + Google OAuth button
- `auth/Register.tsx` — registration
- `admin/Dashboard.tsx` — analytics overview
- `admin/Courses.tsx` — course management
- `admin/CourseDetail.tsx` — content studio (sections/lessons) + Razorpay payment link field
- `admin/Users.tsx` — user management with enrollment/order view
- `admin/Webinars.tsx` — webinar management + RSVP count badges
- `admin/Enquiries.tsx` — course enquiry list (paginated)
- `admin/SiteSettings.tsx` — site title and logo URL
- `student/MyLearning.tsx` — enrolled courses
- `student/CoursePlayer.tsx` — lesson player with progress
- `student/Webinars.tsx` — webinar listing + RSVP toggle
- `student/WebinarDetail.tsx` — webinar detail + RSVP

## Auth Flow

1. JWT stored in localStorage
2. `setAuthTokenGetter` wires token to all API calls automatically
3. `AuthProvider` in `src/lib/auth.tsx` manages session state
4. RBAC: owner > instructor > student

## Roles

- **owner** — full access including billing actions, user management, analytics
- **instructor** — create/manage own courses, view enrollments/orders
- **student** — enroll in courses, track progress, community

## Production Bootstrap (First Owner Account)

A one-time setup endpoint allows creating the first owner account in a fresh production deployment:

```
POST /api/auth/setup
{ "name": "...", "email": "...", "password": "...", "setupToken": "<SETUP_TOKEN value>" }
```

- The endpoint is **disabled by default** — it returns 403 if the `SETUP_TOKEN` environment variable is not set.
- Set the `SETUP_TOKEN` secret in the Replit Secrets panel, call the endpoint, then **remove the secret** to re-disable the endpoint.
- Returns 409 Conflict if any users already exist (one-time use).
- Returns a JWT token on success; subsequent logins use the normal `/api/auth/login` endpoint.

## Environment Variables

- `DATABASE_URL` — Postgres connection string (auto-provided by Replit)
- `SESSION_SECRET` — JWT signing key
- `RESEND_API_KEY` — for transactional email (password reset, enrollment confirmation)
- `FROM_EMAIL` — sender email address
- `APP_URL` — base URL for password reset links
- `SETUP_TOKEN` — (optional) enables one-time owner bootstrap via `POST /api/auth/setup`; remove after use

## Adding Routes

1. Add endpoint to `lib/api-spec/openapi.yaml`
2. Run `pnpm --filter @workspace/api-spec run codegen`
3. Implement handler in `artifacts/api-server/src/routes/`
4. Mount in `artifacts/api-server/src/routes/index.ts`
5. Use generated hook in frontend components

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — start API server
- `pnpm --filter @workspace/lms run dev` — start frontend
- `pnpm --filter @workspace/db run push` — push schema changes
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client
