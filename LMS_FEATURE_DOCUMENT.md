# LMS Academy — Full Feature & Architecture Document

> **Purpose:** UPSC exam preparation learning management system.  
> **Target audience:** Students preparing for UPSC; instructors delivering live and recorded courses; platform owners managing everything.

---

## 1. User Types & Roles (RBAC)

The system has three roles, enforced on every protected API endpoint.

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **owner** | Super-admin. One per platform, created via a one-time setup endpoint. | Full access to everything. Only role that can change site settings, delete courses, delete users, promote/demote roles. |
| **instructor** | Content creator. Created by an owner. | Create and manage their own courses/modules/lessons. View all enrollments and enquiries. Create/manage webinars. Cannot delete users or access other instructors' courses. |
| **student** | Learner. Self-registers or created by an owner. | Browse and view course catalog, enroll via payment link, track personal learning progress, RSVP to webinars, submit course enquiries. |

### Role constraints
- Students **cannot** access any `/admin/*` page or staff API routes.
- Instructors **can** manage only their own courses (ownership is enforced server-side).
- Owners bypass all ownership checks.
- Portal separation: student login page (`/login`) and staff login page (`/staff/login`) are separate; logging into the wrong portal is rejected with a message.

---

## 2. Authentication & Session Management

### Method
- **Email + password** (bcrypt hashing, min 8 chars).
- **JWT tokens** stored in `localStorage`. Every authenticated API request sends `Authorization: Bearer <token>`.
- **Google OAuth** is wired on the student login page (`/api/auth/google`) but the backend OAuth callback needs Passport/Google strategy integration to be fully implemented.
- Tokens are stateless — no refresh token, no server-side session.

### Auth Flows

#### Student Self-Registration (`POST /api/auth/register`)
- Fields: name, email, password (min 8).
- Creates a `student` role user.
- Sends a welcome email via Resend.
- Returns JWT + user profile.
- Duplicate email → 409 Conflict.

#### Login (`POST /api/auth/login`)
- Fields: email, password.
- Returns JWT + user profile.
- Wrong credentials → 401 with message "Invalid credentials".
- Frontend shows inline error banner (not just a toast) on failure.

#### Forgot Password (`POST /api/auth/forgot-password`)
- Accepts email. If user exists, generates a one-time token (UUID, 1 hour TTL) stored in `password_reset_tokens` table.
- Sends reset link via email. Always returns success (no email enumeration).

#### Reset Password (`POST /api/auth/reset-password`)
- Accepts token + new password (min 8). Marks token used. Updates hash.

#### One-Time Owner Setup (`POST /api/auth/setup`)
- Only works when `SETUP_TOKEN` env variable is set AND no users exist.
- Creates the first owner account. Disabled after first use.

#### Admin-Created Users (`POST /api/users`)
- Only owners can call this. Creates instructor or student accounts with a set password. No email verification.

#### Password Change (`PATCH /api/users/:userId/password`)
- Students can change their own password. Owners can change any user's password.

---

## 3. Public-Facing Pages (No Login Required)

### Landing Page (`/`)
- Hero section with configurable site name (from site settings).
- Feature highlights, testimonials, stats.
- "Browse Courses" CTA linking to `/courses`.
- Student login link in the nav.

### Course Catalog (`/courses`)
- Lists all **published** courses.
- Search bar (client-side filter on title/description).
- Filter by course type (recorded / live).
- Course cards show: thumbnail, title, instructor name, price (₹ INR or "Free"), module count, enrollment count, course type badge.
- Clicking a card goes to the course landing page.

### Course Landing Page (`/courses/:slug`)
- Full marketing page for a single published course.
- Sections: hero (title, instructor, price, enroll CTA), long description, what you'll learn, curriculum accordion (modules → lessons), instructor bio.
- **Preview mode**: append `?preview=1` to view as a draft course — shows an amber sticky "Preview Mode" banner at the top. Used by admins to proof courses before publishing.
- **Free lesson preview**: lessons marked `isFree = true` are accessible without enrollment.
- **Enroll / Pay CTA**: 
  - If course has a `paymentLink` (Razorpay or any external URL) → "Enroll Now" button opens that link in a new tab.
  - If course is free (price = 0 or null, no payment link) → shows enquiry form or direct enroll.
- **Course Enquiry Form**: Logged-in students can submit an enquiry on any course landing page. Fields: first name, last name, email, phone, age, number of UPSC attempts. Admins receive these in the Enquiries admin panel.

---

## 4. Student Features (Authenticated Students)

### My Learning (`/my-learning`)
- Shows all courses the student is actively enrolled in.
- Each course card shows: thumbnail, title, progress bar (% of lessons completed), "Continue" button.
- Empty state with CTA to browse courses.

### Course Player (`/my-learning/:courseId`)
- Left sidebar: collapsible module (section) tree with lesson list. Completed lessons show a checkmark.
- Main content area renders the current lesson based on lesson type:
  - **video**: Loom embed (`loom.com` URLs only, validated server-side).
  - **text**: Rich text/markdown content.
  - **live**: Shows Zoom meeting URL + password.
  - **quiz**: Placeholder (quiz type exists in schema but UI is basic).
- "Mark as Complete" button. Progress is recorded per-lesson per-user; idempotent (re-marking does nothing).
- Navigation: Previous / Next lesson buttons.
- Lesson duration shown where set.

### Student Webinars (`/webinars`)
- Lists upcoming webinars (filtered by scheduled date ≥ now).
- Shows: thumbnail image, title, description, date/time, duration, RSVP count, "RSVP" button.
- Students who have RSVP'd see "Cancel RSVP" button.
- Each card links to the webinar detail page.

### Webinar Detail (`/webinars/:id`)
- Full detail view: image, title, description, date/time, duration.
- RSVP / Cancel RSVP button with live count.
- If the webinar is live or upcoming, shows the Zoom link (after RSVP or always — depends on business logic).
- Hero title is always white with drop shadow for legibility over dark/colored backgrounds.

### Student Profile (`/profile`)
- Edit display name.
- Change password (current not required — direct set by authenticated user).
- Shows avatar (URL-based).
- Account creation date.

---

## 5. Admin Features (Owner / Instructor)

All admin pages are under `/admin/*`. The left sidebar nav is the Admin Layout. Instructors see a scoped view of their own courses; owners see everything.

### Admin Dashboard (`/admin/dashboard`)
- Summary stats cards: total courses, total students, total enrollments, active enrollments.
- Recent enrollments list.
- Quick links to key admin sections.

### Admin Courses (`/admin/courses`)
- Full course list with search (title), status filter (draft / published / archived), type filter.
- Each row shows: thumbnail, title, type badge, status badge, instructor, enrollment count, module count, price, actions.
- **Create Course** dialog: title, description, course type (recorded/live), thumbnail URL, price (₹), payment link URL.
- **Publish / Unpublish** toggle buttons per course.
- **Delete** (owner only) with confirmation.
- Clicking a course goes to the Course Detail editor.

### Admin Course Detail (`/admin/courses/:id`)
- Two-panel layout.
- **Left panel — Course Settings**: edit title, description, long description, thumbnail URL, price, payment link, course type, status.
- **Right panel — Curriculum Builder**:
  - Add / rename / delete Modules (sections). Drag reorder via order field.
  - Within each module, add / edit / delete Lessons.
  - Lesson editor fields (vary by type):
    - **Video lesson**: title, Loom video URL (validated — must be `loom.com`), duration, isFree toggle.
    - **Text lesson**: title, text content (markdown/plain), isFree toggle.
    - **Live lesson**: title, Zoom meeting URL, Zoom password, duration, isFree toggle.
    - **Quiz lesson**: title (content field placeholder).
  - isFree toggle: marks lessons visible to non-enrolled visitors on the course landing page.

### Admin Users (`/admin/users`)
- Tabbed view: All / Students / Instructors / Owners.
- Search by name or email.
- Each row: avatar, name, email, role badge, join date, action menu.
- **Actions per user**:
  - **Manage Courses** (student only): dialog showing current enrollments (scrollable, with revoke button per course) and an "Assign New Course" dropdown to manually enroll the student.
  - **Make Instructor / Make Student**: toggle role (owner only).
  - **Delete User** (owner only): with confirmation dialog. Cascades deleting enrollments and progress.
- **Add User** button: owner creates a new student or instructor with name, email, password, role.

### Admin Enrollments (`/admin/enrollments`)
- Stats bar: total enrollments, active enrollments, revoked enrollments.
- Filter bar: debounced search (name or email), course dropdown, status dropdown (active / revoked / expired).
- Table columns: Student (name + email), Course, Status badge, Enrolled date, Expires date, Actions.
- **Assign Course** dialog: live student search, course picker, enroll button. Sends enrollment confirmation email.
- **Revoke** per enrollment row (with confirmation). Sets status to "revoked" (soft delete, record kept).
- Pagination.

### Admin Webinars (`/admin/webinars`)
- Default filter: "upcoming" (past webinars visible via filter toggle).
- Webinar list with RSVP count per webinar.
- **Create Webinar** dialog: title, description, image URL, Zoom URL (required, validated as URL), scheduled date/time, duration (minutes), status (upcoming / live / ended / cancelled).
- **Edit Webinar**: same fields, inline edit.
- **Delete Webinar**: with confirmation.
- **View RSVPs**: expandable panel or modal showing list of RSVP'd students (name, email, RSVP date).

### Admin Enquiries (`/admin/enquiries`)
- Table of all course enquiries submitted by students.
- Columns: Student name, email, phone, age, UPSC attempts, course name, date submitted.
- Paginated. Read-only (no reply/delete in current implementation).

### Admin Site Settings (`/admin/site-settings`)
- Owner-only page.
- Fields: Site Title (used in browser tab, OG tags, etc.), Logo URL, Favicon URL, Social Share Image URL.
- Settings are fetched at app startup via `SiteSettingsProvider` and applied globally.
- Saved to a single-row `site_settings` table (auto-created if missing).

---

## 6. Course Data Model & Hierarchy

```
Course
  ├── type: recorded | live
  ├── status: draft | published | archived
  ├── price (INR, decimal)
  ├── paymentLink (external URL, e.g. Razorpay)
  ├── instructorId → User (instructor or owner)
  └── Modules (sections) [ordered]
        └── Lessons [ordered]
              ├── type: video | text | quiz | live
              ├── videoUrl (Loom only)
              ├── content (text/markdown)
              ├── zoomMeetingUrl + zoomPassword (for live lessons)
              ├── pdfUrl (stored, not yet rendered in UI)
              ├── durationMinutes
              └── isFree (boolean — preview without enrollment)
```

### Course Types
- **Recorded**: Lessons are Loom video embeds or text. Students progress at their own pace.
- **Live**: Lessons contain Zoom meeting links. Course may have a scheduled schedule; webinars are a separate live-session feature.

### Course Status Lifecycle
`draft` → `published` → `archived`  
Only published courses appear in the public catalog and student enrollments. Draft courses can be previewed via `?preview=1`.

---

## 7. Enrollment System

### Enrollment Record
| Field | Details |
|-------|---------|
| userId | FK to user |
| courseId | FK to course |
| status | `active` \| `revoked` \| `expired` |
| enrolledAt | timestamp |
| expiresAt | optional timestamp (for time-limited access) |

### Enrollment Rules
- A user cannot be enrolled twice in the same course (unique active enrollment check).
- Enrollments are **soft-revoked** (status = "revoked"), not deleted.
- Students see only their own enrollments. Admins see all.
- Enrollment confirmation email is sent on admin-assigned enrollment.

### Payment Flow
- The platform does **not** process payments internally. Razorpay (or any payment provider) payment links are stored as `paymentLink` on the course.
- When a student clicks "Enroll Now", they are redirected to the external payment link.
- Enrollment is manually assigned by an admin after confirming payment, OR the payment provider webhook can automate this (webhook not yet implemented in current build).

### Orders Table
The schema has an `orders` table for future payment tracking:
- Links user → course, stores amount (INR), status (pending/paid/failed/refunded), payment gateway name, gateway order ID, affiliate code.
- Not yet surfaced in admin UI — exists for future webhook-based automation.

---

## 8. Progress Tracking

- One `progress` record per user per lesson.
- Created when student clicks "Mark as Complete".
- Idempotent — marking an already-completed lesson does nothing.
- Progress percentage shown on My Learning page: `(completed lessons / total lessons) * 100`.
- Admins do not have a dedicated progress view per student in the current build.

---

## 9. Webinar System

### Webinar Record
| Field | Details |
|-------|---------|
| title | text |
| description | optional text |
| imageUrl | optional image URL |
| zoomUrl | required, validated as URL |
| scheduledAt | timestamp with timezone |
| durationMinutes | integer, default 60 |
| status | `upcoming` \| `live` \| `ended` \| `cancelled` |

### RSVP System
- Students RSVP to webinars (unique per user per webinar).
- RSVP count is returned with every webinar list/detail response.
- Students can cancel RSVP.
- Admins/instructors can view the full RSVP list for any webinar (name, email, RSVP date).
- No email confirmation on RSVP (could be added).

---

## 10. Enquiry System

Students can submit an enquiry on any course landing page. This is for courses where they want more information before enrolling.

### Enquiry Fields
| Field | Validation |
|-------|-----------|
| firstName | required |
| lastName | required |
| email | required, valid email |
| phone | required, min 5 chars |
| age | integer 10–100 |
| upscAttempts | integer 0–20 |

- Links to both the course and the user (nullable if user not logged in, but current UI requires login).
- Admins read all enquiries in the Enquiries admin panel.
- No reply workflow built yet.

---

## 11. Email Notifications

Email is sent via **Resend** (transactional email service). The following emails are sent:

| Trigger | Recipient | Content |
|---------|-----------|---------|
| Student self-registers | New student | Welcome email |
| Admin enrolls student in course | Student | Enrollment confirmation with course name |
| Forgot password request | User | Password reset link (valid 1 hour) |

Email sending is always fire-and-forget (`.catch(() => {})` — failures are silent, do not block the API response).

---

## 12. Site Settings

Global settings stored in a single DB row (`site_settings` table, auto-upserted).

| Setting | Description |
|---------|-------------|
| siteTitle | Displayed in the browser tab, navbar, OG tags |
| logoUrl | Navbar logo image |
| faviconUrl | Browser favicon |
| socialShareImageUrl | Default OG image for social sharing |

Fetched once on app load via `SiteSettingsProvider` React context. Changes take effect on next page load for students.

---

## 13. API Architecture

- **Runtime**: Node.js + Express (TypeScript)
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Authentication**: JWT (HS256), signed with `JWT_SECRET` env variable. 7-day expiry.
- **Logging**: Pino logger (structured JSON logs, pretty in dev).
- **Validation**: Zod on all request bodies.
- **Base path**: All API routes are under `/api/` (proxied from the frontend dev server).

### Route Map

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/auth/register` | No | — | Student self-registration |
| POST | `/api/auth/login` | No | — | Login, returns JWT |
| POST | `/api/auth/logout` | Yes | Any | Logout (stateless — just confirms) |
| GET | `/api/auth/me` | Yes | Any | Get current user profile |
| POST | `/api/auth/forgot-password` | No | — | Request password reset email |
| POST | `/api/auth/reset-password` | No | — | Complete password reset |
| POST | `/api/auth/setup` | No | — | One-time owner bootstrap |
| GET | `/api/courses/catalog` | No | — | Public published course list |
| GET | `/api/courses` | Yes | Any | Admin course list (paginated, filterable) |
| POST | `/api/courses` | Yes | Owner/Instructor | Create course |
| GET | `/api/courses/:id` | Yes | Any | Get course with sections and lessons |
| PATCH | `/api/courses/:id` | Yes | Owner/Instructor | Update course metadata |
| DELETE | `/api/courses/:id` | Yes | Owner | Delete course |
| POST | `/api/courses/:id/publish` | Yes | Owner/Instructor | Set status = published |
| POST | `/api/courses/:id/unpublish` | Yes | Owner/Instructor | Set status = draft |
| GET | `/api/courses/:id/sections` | Yes | Any | List sections with lessons |
| POST | `/api/courses/:id/sections` | Yes | Owner/Instructor | Create section |
| PATCH | `/api/courses/:id/sections/:sid` | Yes | Owner/Instructor | Update section |
| DELETE | `/api/courses/:id/sections/:sid` | Yes | Owner/Instructor | Delete section |
| POST | `/api/courses/:id/sections/:sid/lessons` | Yes | Owner/Instructor | Create lesson |
| GET | `/api/courses/:id/sections/:sid/lessons/:lid` | Yes | Any | Get lesson |
| PATCH | `/api/courses/:id/sections/:sid/lessons/:lid` | Yes | Owner/Instructor | Update lesson |
| DELETE | `/api/courses/:id/sections/:sid/lessons/:lid` | Yes | Owner/Instructor | Delete lesson |
| POST | `/api/courses/:id/enquiries` | Yes | Student | Submit course enquiry |
| GET | `/api/enrollments` | Yes | Any | List enrollments (students see own) |
| POST | `/api/enrollments` | Yes | Owner/Instructor | Enroll a user in a course |
| GET | `/api/enrollments/:id` | Yes | Any | Get enrollment detail |
| DELETE | `/api/enrollments/:id` | Yes | Owner/Instructor | Revoke enrollment |
| GET | `/api/progress` | Yes | Any | Get lesson progress for current user |
| POST | `/api/progress/lesson/:lessonId/complete` | Yes | Any | Mark lesson complete |
| GET | `/api/users` | Yes | Owner/Instructor | List users (paginated, searchable) |
| POST | `/api/users` | Yes | Owner | Admin create user |
| GET | `/api/users/:id` | Yes | Any | Get user profile + enrollments + orders |
| PATCH | `/api/users/:id` | Yes | Any | Update user profile (role: owner only) |
| DELETE | `/api/users/:id` | Yes | Owner | Delete user |
| PATCH | `/api/users/:id/password` | Yes | Any | Change password |
| GET | `/api/webinars` | Yes | Any | List webinars (filter: upcoming/past/all) |
| POST | `/api/webinars` | Yes | Owner/Instructor | Create webinar |
| GET | `/api/webinars/:id` | Yes | Any | Get webinar detail |
| PATCH | `/api/webinars/:id` | Yes | Owner/Instructor | Update webinar |
| DELETE | `/api/webinars/:id` | Yes | Owner/Instructor | Delete webinar |
| POST | `/api/webinars/:id/rsvp` | Yes | Student | RSVP to webinar |
| DELETE | `/api/webinars/:id/rsvp` | Yes | Student | Cancel RSVP |
| GET | `/api/webinars/:id/rsvps` | Yes | Owner/Instructor | List RSVPs for a webinar |
| GET | `/api/enquiries` | Yes | Owner/Instructor | List all course enquiries |
| GET | `/api/site-settings` | No | — | Get site settings (public) |
| PATCH | `/api/site-settings` | Yes | Owner | Update site settings |

---

## 14. Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| name | text | Not null |
| email | text | Unique, not null |
| passwordHash | text | Null for OAuth users |
| role | enum | `owner` / `instructor` / `student` |
| avatarUrl | text | Optional |
| googleId | text | Optional, for Google OAuth |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### `password_reset_tokens`
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| userId | text | FK → users (cascade delete) |
| token | text | Unique |
| expiresAt | timestamptz | 1 hour from creation |
| usedAt | timestamptz | Null until used |
| createdAt | timestamptz | |

### `courses`
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| title | text | Not null |
| slug | text | Unique, URL-friendly auto-generated |
| description | text | Short description |
| longDescription | text | Marketing long-form |
| courseType | enum | `recorded` / `live` |
| thumbnailUrl | text | |
| price | numeric(10,2) | INR, null = free |
| paymentLink | text | External checkout URL (Razorpay etc.) |
| status | enum | `draft` / `published` / `archived` |
| instructorId | text | FK → users |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### `sections` (Modules)
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| courseId | text | FK → courses (cascade delete) |
| title | text | Not null |
| order | integer | Display order |
| createdAt | timestamptz | |

### `lessons`
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| sectionId | text | FK → sections (cascade delete) |
| title | text | Not null |
| type | enum | `video` / `text` / `quiz` / `live` |
| content | text | Text/markdown content |
| videoUrl | text | Loom URL only |
| pdfUrl | text | PDF attachment URL |
| zoomMeetingUrl | text | For live lessons |
| zoomPassword | text | For live lessons |
| durationMinutes | integer | |
| order | integer | Display order |
| isFree | boolean | Preview without enrollment |
| createdAt | timestamptz | |

### `enrollments`
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| userId | text | FK → users (cascade delete) |
| courseId | text | FK → courses (cascade delete) |
| status | enum | `active` / `revoked` / `expired` |
| enrolledAt | timestamptz | |
| expiresAt | timestamptz | Null = no expiry |

### `progress`
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| userId | text | FK → users (cascade delete) |
| lessonId | text | FK → lessons (cascade delete) |
| courseId | text | FK → courses (cascade delete) |
| completedAt | timestamptz | |

### `webinars`
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| title | text | Not null |
| description | text | |
| imageUrl | text | |
| zoomUrl | text | Not null, validated URL |
| scheduledAt | timestamptz | Not null |
| durationMinutes | integer | Default 60 |
| status | text | `upcoming` / `live` / `ended` / `cancelled` |
| createdAt | timestamptz | |

### `webinar_rsvps`
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| webinarId | text | FK → webinars (cascade delete) |
| userId | text | FK → users (cascade delete) |
| createdAt | timestamptz | |
| — | unique | (webinarId, userId) |

### `course_enquiries`
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| courseId | text | FK → courses (cascade delete) |
| userId | text | FK → users (set null on delete) |
| firstName | text | Not null |
| lastName | text | Not null |
| email | text | Not null |
| phone | text | Not null |
| age | integer | 10–100 |
| upscAttempts | integer | 0–20 |
| createdAt | timestamptz | |

### `orders`
| Column | Type | Notes |
|--------|------|-------|
| id | text (UUID) | PK |
| userId | text | FK → users (restrict delete) |
| courseId | text | FK → courses (restrict delete) |
| amount | numeric(10,2) | Not null |
| currency | text | Default "INR" |
| status | enum | `pending` / `paid` / `failed` / `refunded` |
| paymentGateway | text | e.g. "razorpay" |
| gatewayOrderId | text | From payment provider |
| affiliateCode | text | Optional referral tracking |
| createdAt | timestamptz | |
| paidAt | timestamptz | |

### `site_settings`
| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK (single row) |
| siteTitle | text | Default "LMS Academy" |
| logoUrl | text | |
| faviconUrl | text | |
| socialShareImageUrl | text | |
| updatedAt | timestamptz | |

---

## 15. Frontend Architecture

- **Framework**: React 18 + Vite
- **Router**: Wouter (lightweight, hash-free, base-path aware)
- **State / Server cache**: TanStack React Query
- **UI**: shadcn/ui components + Tailwind CSS
- **Forms**: React Hook Form + Zod resolvers
- **Animations**: Framer Motion
- **Notifications**: Sonner (toast library)
- **Icons**: Lucide React
- **Date formatting**: date-fns

### Key Frontend Patterns
- `AuthProvider` wraps the whole app; exposes `useAuth()` hook (user, login, logout, register, isAuthenticated, isLoading).
- `SiteSettingsProvider` fetches site settings on load; exposes `useSiteSettings()`.
- Admin pages use generated API client hooks from `@workspace/api-client-react` (auto-generated from OpenAPI spec).
- Some admin pages (webinars, enquiries, site settings) use raw `fetch` with manual JWT header.
- `AdminLayout` sidebar component wraps all `/admin/*` pages.
- Route protection: each admin page manually checks `user?.role` and redirects; student pages redirect to login if unauthenticated.

---

## 16. Environment Variables Required

| Variable | Used By | Description |
|----------|---------|-------------|
| `DATABASE_URL` | API server | PostgreSQL connection string |
| `JWT_SECRET` | API server | Secret for signing JWT tokens |
| `RESEND_API_KEY` | API server | Resend email service API key |
| `FROM_EMAIL` | API server | Sender address for emails |
| `APP_URL` | API server | Base URL for password reset links |
| `SESSION_SECRET` | API server | Express session secret (for OAuth if added) |
| `SETUP_TOKEN` | API server | One-time token to create first owner account |
| `PORT` | Both servers | Port to listen on (set by Replit) |

---

## 17. Known Gaps / Future Work (Not Yet Implemented)

| Feature | Status |
|---------|--------|
| Google OAuth complete backend | Wired on frontend, backend callback not implemented |
| Razorpay webhook → auto-enrollment | Orders table exists; webhook handler not built |
| Affiliate tracking | `affiliateCode` field in orders exists; no tracking UI |
| Quiz lesson content | Type exists; no quiz builder or quiz-taking UI |
| PDF lesson viewer | `pdfUrl` field stored; not rendered in player |
| Admin progress reporting | No per-student progress view for admins |
| Webinar RSVP email confirmation | No email sent on RSVP |
| Enquiry reply workflow | Enquiries are read-only in admin; no reply/status system |
| Course reviews / ratings | Not implemented |
| Discussion / community | Schema stub exists (`community.ts`); no implementation |
| Live sessions management | Separate schema stub (`live-sessions.ts`); no implementation |
| Certificate generation | Not implemented |
| Bulk enrollment / CSV import | Not implemented |
| Dark mode | Tailwind dark class support is present; no toggle UI |
