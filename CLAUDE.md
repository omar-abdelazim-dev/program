# Program — Project Context

## What this is
A MERN-stack e-learning MVP. Students browse/enroll/watch courses and track progress.
Instructors create courses and lessons. Admins approve courses before they go live.

## Tech stack
- Backend: Node.js, Express, MongoDB + Mongoose
- Frontend: React, Vite, Tailwind CSS v4, React Router
- Auth: JWT in HTTP-only cookies (never localStorage for the token itself)
- Media: Cloudinary (video + image), via Multer memory storage streamed directly to Cloudinary

## Scope boundaries — do not build these unless explicitly asked
No payments/Stripe (price is display-only), no live chat, no gamification, no
certificates, no wishlist, no mobile apps, no advanced analytics, no forgot-password flow.

## Current status (as of last review)

**Backend: complete and stable.** Auth, Course/Lesson CRUD, admin approval,
enrollment with progress tracking, Cloudinary upload — all built across 4 milestones.
Do not casually rewrite backend files; they've been reviewed and tested. If something
seems wrong, ask before changing it.

**Frontend: partially wired.** Two frontends were built somewhat independently and
merged. The current frontend (in `client/src/`) has real, working:
- Login / Register (calls `/api/auth/login`, `/api/auth/register`)
- Session persistence (`/api/auth/me` on load)
- Course catalog browsing (`GET /api/courses`)

...but the following are still mocked/disconnected and need wiring to the real API
(see "Active task list" below):
- Course details page
- Enroll button (currently fakes a payment flow — payments are out of scope, replace
  with a real `POST /api/enrollments/:courseId` call, no fake payment simulation)
- Lesson video player / progress tracking
- Registration has no role selector — every signup defaults to `student`
- Instructor dashboard (create course, add lesson) — doesn't exist yet in this frontend
- Admin approval dashboard — doesn't exist yet in this frontend

## API reference (backend is already built — wire the frontend to match this, don't reinvent it)

**Auth**
- `POST /api/auth/register` — body: `{ name, email, password, role }` (role: 'student' | 'instructor')
- `POST /api/auth/login` — body: `{ email, password }`
- `POST /api/auth/logout`
- `GET /api/auth/me` 🔒 — returns `{ user }`

**Courses** — content hierarchy is `Course → Module → Lesson` (not a flat lesson list)
- `GET /api/courses?search=&category=` — public catalog, approved only
- `GET /api/courses/:id` — returns `{ course, modules }`. Each module: `{ _id, title, description, order, lessons }`, and each lesson has `{ _id, title, order }` only — videoUrl deliberately excluded here.
- `POST /api/courses` 🔒 instructor — body: `{ title, description, price, category, thumbnailUrl }`
- `GET /api/courses/mine` 🔒 instructor — own courses, any status
- `POST /api/courses/:courseId/modules` 🔒 instructor — body: `{ title, description }`
- `PUT /api/courses/:courseId/modules/:moduleId` 🔒 instructor
- `DELETE /api/courses/:courseId/modules/:moduleId` 🔒 instructor — cascades, deletes the module's lessons too
- `PUT /api/courses/:courseId/modules-reorder` 🔒 instructor — body: `{ moduleIds: [...] }` (full ordered array)
- `POST /api/courses/:courseId/modules/:moduleId/lessons` 🔒 instructor — body: `{ title, videoUrl }`
- `PUT /api/courses/:courseId/modules/:moduleId/lessons-reorder` 🔒 instructor — body: `{ lessonIds: [...] }`
- `PUT /api/courses/:courseId/lessons/:lessonId` 🔒 instructor
- `DELETE /api/courses/:courseId/lessons/:lessonId` 🔒 instructor
- `GET /api/courses/:courseId/lessons/:lessonId` 🔒 — returns `{ lesson }` WITH videoUrl. Requires enrollment, ownership, or admin.
- `PATCH /api/courses/:id/publish` 🔒 instructor — `draft → approved` (live) requires at least one module with at least one lesson, else 400
- `GET /api/courses/pending` 🔒 admin
- `PATCH /api/courses/:id/approve` 🔒 admin
- `PATCH /api/courses/:id/reject` 🔒 admin

**Enrollment**
- `POST /api/enrollments/:courseId` 🔒 student — 201 success, 409 already enrolled, 403 course not approved
- `GET /api/enrollments/:courseId` 🔒 — returns `{ enrolled, completedLessonIds, totalLessons, progressPercent, moduleProgress }`, where `moduleProgress` is `[{ moduleId, title, completedCount, totalCount, percent }]`
- `GET /api/enrollments/mine` 🔒 student
- `PATCH /api/enrollments/:courseId/lessons/:lessonId/complete` 🔒 student — idempotent, safe to call repeatedly, returns the same shape as `GET /api/enrollments/:courseId` minus `enrolled`

**Uploads**
- `POST /api/uploads/video` 🔒 instructor — multipart field name `video`, 500MB limit, returns `{ url }`
- `POST /api/uploads/image` 🔒 instructor — multipart field name `image`, 5MB limit, returns `{ url }`

All errors follow `{ message: "..." }`.

## Active task list (in priority order)
1. Add role selection to Register (student/instructor toggle), send `role` in the register call
2. Wire Course Details page to `GET /api/courses/:id`
3. Wire Enroll button to real `POST /api/enrollments/:courseId` — remove fake payment simulation
4. Wire Learning Portal (video player) to the real gated lesson endpoint + mark-complete + progress
5. Build Instructor dashboard (create course, add lesson with video upload)
6. Build Admin approval dashboard

Do these one at a time. Run `npm run build` in `client/` after each and confirm zero
errors before moving to the next. Don't do multiple tasks silently in one pass.

## Known non-blocking issues
- "Remember Me" checkbox on login is decorative, not wired
- "Forgot password" link points to `#`, no reset flow exists
- Frontend CSS/theme values may not perfectly match original design intent (see repo history)

## Testing
`server/test-integration.js` runs real assertions against an in-memory MongoDB
(register → create course → enroll → mark complete → verify progress). Run with
`node test-integration.js` from `server/`. This is the real acceptance test — if you
change backend logic, re-run this and make sure it still passes.
