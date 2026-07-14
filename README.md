# Program

A MERN-stack e-learning platform where university students discover courses, watch video lessons, and track progress — instructors create courses, admins approve them before they go live.

## Status

Backend feature-complete (auth, courses, enrollment, video upload). Frontend wired end-to-end across all three user roles. Not yet deployed. See [Known Limitations](#known-limitations) before treating this as production-ready.

## The three flows

**Student** — Register → Browse/search courses → View details → Enroll → Watch video lessons → Mark lessons complete → See progress bar

**Instructor** — Register → Dashboard → Create course (title, description, price, category, thumbnail) → Add lessons (title, video upload) → Submit for approval

**Admin** — Login → Dashboard → See pending courses → Approve/reject → Course goes live on the public catalog

## Tech stack

- **Backend:** Node.js, Express, MongoDB + Mongoose
- **Frontend:** React, Vite, Tailwind CSS v4, React Router
- **Auth:** JWT stored in HTTP-only cookies (not localStorage — see [Security notes](#security-notes))
- **Media:** Cloudinary (video + image), Multer (memory storage, streamed directly to Cloudinary)

## Explicitly out of scope

Payments (price is display-only), live chat, gamification, certificates, wishlist, mobile apps, advanced analytics, forgot-password flow.

---

## Project structure

```
server/
  models/         User, Course, Lesson, Enrollment (Mongoose schemas)
  controllers/    Route handler logic
  routes/         Express route definitions
  middleware/     authMiddleware (protect/authorize), optionalAuth, upload (multer)
  config/         db.js, cloudinary.js
  utils/          JWT cookie helper
  app.js          Express app definition (no listen/DB connect — testable)
  server.js       Boots app.js + DB connection
  test-integration.js   End-to-end test against a real in-memory MongoDB

client/src/
  api/            axios instance + courses/enrollments/upload API modules
  context/        AuthContext (global user state)
  components/     Navbar, SidebarLayout, ProtectedRoute, StatusBadge
  pages/          Landing, Login, Register, Dashboard, BrowseCourses,
                  CourseDetails, LessonPlayer
  pages/student/  MyLearning
  pages/instructor/  InstructorDashboard, CreateCourse, ManageCourse
  pages/admin/    AdminDashboard
```

## Data models

- **User** — name, email, password (bcrypt-hashed), role (`student` / `instructor` / `admin`). Admin role is never assignable through public registration — must be seeded directly in the database.
- **Course** — title, description, price, category, instructor (ref), status (`pending` / `approved` / `rejected`), thumbnailUrl
- **Lesson** — title, videoUrl, course (ref), order (auto-numbered)
- **Enrollment** — student (ref), course (ref), completedLessons (array of Lesson refs). Unique compound index on (student, course) prevents duplicate enrollment at the database level.

## API reference

All routes are prefixed `/api`. Routes marked 🔒 require a valid auth cookie; role restrictions noted in parentheses.

**Auth**

| Method | Route | Description |
|---|---|---|
| POST | `/auth/register` | Create account (student or instructor only) |
| POST | `/auth/login` | Log in, sets JWT cookie |
| POST | `/auth/logout` | Clears cookie |
| GET | `/auth/me` 🔒 | Returns current user |

**Courses**

| Method | Route | Description |
|---|---|---|
| GET | `/courses` | Public catalog — approved only, supports `?search=` and `?category=` |
| GET | `/courses/:id` | Course details + lesson titles (videoUrl excluded — see below) |
| POST | `/courses` 🔒 instructor | Create course (status defaults to `pending`) |
| GET | `/courses/mine` 🔒 instructor | List own courses, any status |
| POST | `/courses/:courseId/lessons` 🔒 instructor | Add a lesson (must own the course) |
| GET | `/courses/:courseId/lessons/:lessonId` 🔒 | Returns lesson **with** videoUrl — requires enrollment, ownership, or admin |
| GET | `/courses/pending` 🔒 admin | List pending courses |
| PATCH | `/courses/:id/approve` 🔒 admin | Approve a course |
| PATCH | `/courses/:id/reject` 🔒 admin | Reject a course |

**Enrollment**

| Method | Route | Description |
|---|---|---|
| POST | `/enrollments/:courseId` 🔒 student | Enroll (rejects duplicates with 409) |
| GET | `/enrollments/:courseId` 🔒 | Enrollment status + progress % |
| GET | `/enrollments/mine` 🔒 student | All enrollments with computed progress |
| PATCH | `/enrollments/:courseId/lessons/:lessonId/complete` 🔒 student | Mark lesson complete (idempotent) |

**Uploads**

| Method | Route | Description |
|---|---|---|
| POST | `/uploads/video` 🔒 instructor | Stream video to Cloudinary (500MB limit), returns URL |
| POST | `/uploads/image` 🔒 instructor | Stream image to Cloudinary (5MB limit), returns URL |

## Security notes

- JWT lives in an **HTTP-only cookie**, not localStorage — invisible to JavaScript, mitigating XSS token theft. `secure: true` and `sameSite: 'none'` are enforced in production for the cross-origin Render/Vercel setup.
- **Lesson video URLs are never exposed publicly.** `/courses/:id` deliberately strips `videoUrl` from its response; only the gated `/courses/:courseId/lessons/:lessonId` endpoint returns it, and only to an enrolled student, the owning instructor, or an admin.
- Enrollment double-submission is prevented at the **database level** (unique index), not just application logic, so it's race-condition-safe.
- `markLessonComplete` uses `$addToSet`, so repeated calls never duplicate progress.
- Admin accounts cannot be created through the public register endpoint under any input — must be seeded directly in MongoDB.

## Setup

**Backend**
```bash
cd server
cp .env.example .env   # fill in MongoDB Atlas URI, JWT secret, Cloudinary credentials
npm install
npm run dev             # http://localhost:5000
```

**Frontend**
```bash
cd client
cp .env.example .env.local   # defaults already point to localhost
npm install
npm run dev                   # http://localhost:5173
```

**Integration test** (real assertions against an in-memory MongoDB — register, create course, enroll, block unauthorized access, approve, verify progress tracking):
```bash
cd server
node test-integration.js
```

## Known limitations

- **Integration test and Cloudinary uploads have not been executed end-to-end by the person deploying this** — the development sandbox this was built in has no network access to `mongodb.org` or `api.cloudinary.com`. The code is correct against both services' documented APIs and passes every static/build check available, but running `test-integration.js` yourself, and doing one real video upload, are the two remaining acceptance checks before calling this done.
- Not yet deployed. CORS origin and cookie `sameSite`/`secure` settings are pre-configured for a cross-origin Render (backend) + Vercel (frontend) setup, but untested against real production domains.
- No rate limiting, no automated security audit pass.
- Frontend visual design (colors, custom CSS classes like `.auth-card`, `.dash-card`) was partially reconstructed where the original theme file was missing — confirm it matches actual intended design.
- No forgot-password flow (link exists in the UI, not wired to anything).

## History

`MERGE_NOTES.md` documents the specific file-by-file provenance of the frontend/backend merge (what came from the friend's build vs. reconstructed), for reference.
