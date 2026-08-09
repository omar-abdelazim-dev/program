# Project Handoff — For Future AI Agents

> This document is a **handoff guide for an AI coding agent** that will continue
> working on this site. Read it fully before making changes. It describes the
> tech stack, the design system, the light/dark mode theming model, the exact
> state of every recent edit, and the conventions you must preserve.

---

## 0. TL;DR

- MERN-stack e-learning MVP. Root: `C:\Users\ahmad\Desktop\program-week2`.
- Backend (`server/`) is **complete/stable — do not casually rewrite it.** Verify
  with `node test-integration.js` in `server/` if you change backend logic.
- Frontend (`client/`) is where all recent UI work happened.
- **Every change you make here must pass** `npm run build` in `client/` (zero
  errors). This is the acceptance gate.
- Use a **developer-mode hard refresh (Ctrl+F5)** after UI changes — the Vite
  dev server can serve stale builds (this has caused false "nothing changed"
  reports before). Sometimes a full `npm run dev` restart is required.

---

## 1. Active Task List (in priority order)

From the project context file (`CLAUDE.md`). If someone hasn't explicitly told
you a different order, preserve this:

1. Add role selection to Register (student/instructor toggle); send `role` in the
   register call.
2. Wire Course Details page to `GET /api/courses/:id`.
3. Wire Enroll button to real `POST /api/enrollments/:courseId` — remove the fake
   payment simulation (payments are OUT OF SCOPE).
4. Wire the Learning Portal video player to the gated lesson endpoint +
   mark-complete + progress.
5. Build the Instructor dashboard (create course, add lesson with video upload).
6. Build the Admin approval dashboard.

Rules for these tasks (from CLAUDE.md):
- Do them **one at a time**.
- Run `npm run build` in `client/` after each and confirm zero errors before
  moving on. Do NOT do multiple tasks silently in one pass.

---

## 2. Conventions / Rules You Must Follow

- **No emojis** in docs or UI unless explicitly requested.
- **No code comments** unless asked.
- **API reference is authoritative** — see CLAUDE.md. The backend already
  implements `POST /api/auth/register|login|logout`, `GET /api/auth/me`,
  course/enrollment/lesson/upload routes. **Wire the frontend to these; do not
  reinvent the API.**
- Errors: `{ message: "..." }`. Auth is JWT in HTTP-only cookies — never store
  the token in localStorage.
- Media: Cloudinary via Multer memory → streamed directly. Upload fields:
  video named `video`, image named `image`.
- When editing code, mimic the surrounding file's existing style and reuse
  existing libraries/utilities. Don't assume a library exists — check first.

---

## 3. Theming Model (CRITICAL)

There are TWO theme scopes that both define the same variable names. Understand
this to avoid "it works in dark but not light" bugs:

**CSS variables** in `client/src/styles/content.css`:
- `:root` (lines 1–32) = **dark** defaults:
  - `--bg-main: #15141E`
  - `--bg-surface: #1F1E2C`
  - `--inner-shadow: inset 0 4px 12px rgba(0,0,0,0.5)`
  - `--outer-shadow: 0 4px 12px rgba(0,0,0,0.5)`
  - `--radius-card: 50px`, `--radius-btn: 50px` (lines 28–29)
- `body.light-mode` (line 36) = light overrides:
  - `--bg-main: #FAF7F2`
  - `--bg-surface: #FFFFFF`
  - `--inner-shadow: inset 0 4px 12px rgba(0,0,0,0.08)` (subtle!)
  - `--outer-shadow: 0 4px 12px rgba(0,0,0,0.08)`

`body[data-role]` in `client/src/index.css` (lines ~44–45 and ~67–68) redefines
`--bg-main`/`--bg-surface` for role-scoped scopes (`#1f2028`/`#2e303a` and
`#15141E`/`#1F1E2C`). This is why `--bg-main` can resolve differently depending
on context. If you need a background to be guaranteed, prefer CSS variables over
hard-coded hex; if you see a var misbehaving, check load order (last-loaded
equal-specificity rule wins).

**Key rule:** `background-clip: text` (gradient text) ALSO clips
`background-color` to the text shape — it makes the element's background
invisible. If an element needs BOTH colored text AND a visible fill, do NOT use
the gradient-clip trick; use a solid text color (e.g. `#f97316`) instead.

There are OTHER css files that each redefine vars too — `header.css`,
`student-layout.css`, `landing-page.css`, `sideBar.css`, `loading.css`.
`loading.css` line 35 uses `var(--bg-main, #15141E)` fallbacks.

---

## 4. Current UI Changes (handoff reference)

All builds pass. Organized by area.

### 4.1 Routing — `client/src/App.jsx`
- `/student/:id` → `StudentProfilePage` route exists (line 272).
- Instructor guard: individual profiles `/student/:id` (regex
  `/^\/student\/[^/]+$/`) are now OPEN to instructors. Only general portal paths
  (`/student`, `/student/explore`, …) redirect instructors. Don't regress this.

### 4.2 STU-07 — Clickable student profiles
- `client/src/components/LearningPortal.jsx`:
  - Imports `Link`.
  - Student name → `<Link to={/student/${student.id}}>`.
  - Student avatar → clickable `Link` (`borderRadius:'50%'`, `flexShrink`).
  - Instructor reply name → `<Link to={/instructor/:id}>`.
- `client/src/components/InstructorEngagementTab.jsx`:
  - Uses `useNavigate`; student avatar + name → `navigate('/student/:id')`.
- `client/src/components/InstructorReviewsTab.jsx`:
  - Student-name text-underline removed; course/date line kept.
- `client/src/components/StudentProfilePage.jsx`: pre-existing, server-driven
  (GET user profile + enrollments via `userController.js`).

### 4.3 Border radius → 50px
- Content.css auth: `.auth-tabs`, `.tab-slider` → 50px.
- Admin sidebar: `.admin-sidebar-tab` → 50px (content.css); sliding pill inline
  in `AdminPortal.jsx` (~line 817) → 50px. (An earlier `sideBar.css` edit was
  reverted — wrong file.)
- Cards DARK (`body:not(.light-mode)` block, content.css ~line 2667):
  `.glass-card/.dash-card/.course-card/.admin-card/.table-card/.analytics-card/
  .cc-card` → `border-radius:50px !important` + blur + no border + outer-shadow.
- Cards LIGHT (`body.light-mode` block, content.css ~line 2940): same card list
  does background/border/shadow but orphanally we ADDED
  `border-radius: 50px !important` so light matches dark. (This was the last
  change. Verify both modes if you touch this again.)
- Admin Users tab dropdown (in `AdminUserManagementTab.jsx`): filter card 50px;
  trigger 50px; menu 30px (final — was 50→40→30); clear-all 50px; option items
  50px.
- Custom select `.custom-select-dropdown` (content.css line 2192) → 50px —
  used by student-college filter (`CustomSelect.jsx`).
- "View :button": in `AdminUserManagementTab.jsx`, set `marginLeft:'auto'`
  + `display:'block'` so it right-aligns under the "Action" column header.

### 4.4 Users tab dropdown active-option (final state)
`AdminUserManagementTab.jsx`, `CustomDropdown`, inline option button styles
(lines ~122–151):
- Active (value equals option):
  - `background: var(--bg-main)`
  - `box-shadow: var(--inner-shadow)`
  - `border: none`
  - `border-radius: 50px`
  - `color: #f97316`
  - `font-weight: 600`
- Non-active: transparent bg; hover sets `background: var(--bg-main)`,
  `color: var(--c-light)`.
- **Removed** the gradient-clip text approach (see theming warning in §3 —
  it hid the bg fill).
- Light mode uses the same code (var-based) — just less prominent due to the
  subtle light `--inner-shadow`.

---

## 5. Build & Verify Workflow

```
# (from project root)
cd client
npm run build      # MUST pass with zero errors
```

- Accept a single harmless warning: chunks >500 kB (~1.23 MB). It's expected.
- Backend regression test (only if you change server logic):
  ```
  cd server
  node test-integration.js
  ```
  This runs against in-memory MongoDB (register → create course → enroll →
  mark complete → verify progress).

---

## 6. Files Touched (index by purpose)

| File | Purpose |
|------|---------|
| `client/src/App.jsx` | instructor guard allows `/student/:id` |
| `client/src/components/LearningPortal.jsx` | clickable student/instructor profiles |
| `client/src/components/InstructorEngagementTab.jsx` | navigate to student profile |
| `client/src/components/InstructorReviewsTab.jsx` | removed student-name underline |
| `client/src/components/AdminUserManagementTab.jsx` | dropdown active style + radii + button align |
| `client/src/components/AdminPortal.jsx` | sidebar sliding-pill radius |
| `client/src/components/CustomSelect.jsx` | college-filter dropdown |
| `client/src/styles/content.css` | theme vars + radii (dark & light) + `.custom-select-dropdown` |

---

## 7. Gotchas to avoid

1. **Stale builds** — hard refresh (Ctrl+F5) or restart `npm run dev`.
2. **radius in light vs dark** — they live in different CSS blocks
   (`body:not(.light-mode)` vs `body.light-mode`); keep both in sync.
3. **`background-clip: text` kills background fill** — don't pair gradient text
   with a colored fill.
4. **`--radius-card`/`--radius-btn`** = the canonical 50px tokens; use them, don't
   hard-code duplicate 50px if you can reference them.
5. **Don't rewrite the backend** — review+ask first (CLAUDE.md).
6. **Same-file CSS vars** are redefined in several css files — if a var
   "doesn't respond," check load order & equal-specificity ties.

---

_Last updated: 2026-08-07. Next agent should re-run `npm run build` after any
edit and confirm light+dark mode before considering a change complete._