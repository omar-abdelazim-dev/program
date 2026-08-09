# Changelog — Program (E-Learning MVP)

A detailed record of all front-end changes made to the Program MERN-stack
e-learning platform. Organized by area: routing, features (STU-07), and UI/UX
polish. All edits build cleanly with `npm run build` in `client/` (zero errors;
only a harmless >500 kB chunk-size warning ~1.23 MB).

---

## 1. Routing

### `client/src/App.jsx`
- **Student profile route** (`/student/:id` → `StudentProfilePage`) at line 272
  was pre-existing — added nothing new.
- **Instructor guard update:** Instructors are no longer redirected away from the
  individual profile path `/student/:id` (regex `/^\/student\/[^/]+$/`). Only
  general portal paths (e.g. `/student`, `/student/explore`) still redirect
  instructors. This allows instructors to open individual student profiles.

---

## 2. STU-07 — Clickable student profiles

### `client/src/components/LearningPortal.jsx`
- Added `Link` import from `react-router-dom`.
- **Student name** in the student row wrapped in `<Link to={`/student/${student.id}`}>`.
- **Student avatar** wrapped in a clickable `Link` to `/student/:id` with
  `borderRadius: '50%'` and `flexShrink` to avoid layout shift.
- **Instructor reply name** wrapped in `Link` to `/instructor/:id`.

### `client/src/components/InstructorEngagementTab.jsx`
- Added `useNavigate`.
- Student **avatar and name** now call `navigate('/student/:id')` to open the
  student profile.

### `client/src/components/InstructorReviewsTab.jsx`
- Removed the text-underline under the student name (cleanup). The course/date
  line was intentionally preserved.

---

## 3. Border radius → 50px

Purpose: consistent pill/card radius across the app. Tokens
`--radius-card: 50px` and `--radius-btn: 50px` are defined in
`client/src/styles/content.css` (lines 28–29).

### Auth page — `client/src/styles/content.css`
- `.auth-tabs` and `.tab-slider` (sliding tab indicator) → `border-radius: 50px`.

### Admin sidebar — `content.css` + `client/src/components/AdminPortal.jsx`
- `.admin-sidebar-tab` → `50px`.
- Sliding pill (inline style in `AdminPortal.jsx` ~line 817) → `50px`.
- Reverted an incorrect edit to `sideBar.css` (not the right file for this).

### Cards — dark mode (`content.css` ~line 2667, `body:not(.light-mode)` block)
- `.glass-card`, `.dash-card`, `.course-card`, `.admin-card`, `.table-card`,
  `.analytics-card`, `.cc-card` → `border-radius: 50px !important`, plus
  `backdrop-filter: blur(20px)`, `border: none`, `box-shadow: var(--outer-shadow)`.

### Cards — light mode (`content.css` ~line 2940, `body.light-mode` block)
- Added `border-radius: 50px !important` to the shared card block
  (`.glass-card`, `.dash-card`, `.course-card`, `.stat-card`, `.instructor-card`,
  `.side-card`, `.path-card`, `.continue-card`, `.cc-card`, `.role-card`) so light
  mode matches dark mode.

### Admin Users tab — `client/src/components/AdminUserManagementTab.jsx`
- Filter card → `50px`.
- Dropdown trigger (line 69) → `50px`.
- Dropdown menu (line 106) → `50px` → `40px` → `30px` (final).
- Clear-all button → `50px`.
- Dropdown option items → `50px`.

### Custom select (student college filter)
- `client/src/styles/content.css` (line 2192) `.custom-select-dropdown` → `50px`,
  used by `client/src/components/CustomSelect.jsx`.

### "View Profile" alignment
- `client/src/components/AdminUserManagementTab.jsx` — button changed to
  `marginLeft: auto; display: block` so it right-aligns under the "Action" header.

---

## 4. Admin Users tab dropdown — active option

### `client/src/components/AdminUserManagementTab.jsx` (CustomDropdown, ~lines 122–151)
Iterated on the `value.toLowerCase() === opt.toLowerCase()` (active) option:

1. Started with `background: var(--bg-main)` + inner shadow + **gradient text**
   (`backgroundImage: linear-gradient(90deg, #f97316, #fbad41)` +
   `WebkitBackgroundClip: text`).
2. **Bug:** `background-clip: text` clips the entire background to the text
   shape, so the main bg color never painted → looked like "no bg".
3. **Final:**
   - Active: `background: var(--bg-main)`,
     `box-shadow: var(--inner-shadow)`, `border: none`, `border-radius: 50px`,
     `color: #f97316`, `font-weight: 600`.
   - Removed the gradient-clip entirely so the fill actually renders.
   - Hover (non-active): `background: var(--bg-main)`, `color: var(--c-light)`,
     `box-shadow: none`.

### Theme-awareness (light/dark)
All dropdown colors use CSS variables, so they switch automatically under
`body.light-mode`:
- Dark: `--bg-main: #15141E`, `--bg-surface: #1F1E2C`,
  `--inner-shadow: inset 0 4px 12px rgba(0,0,0,0.5)`.
- Light: `--bg-main: #FAF7F2`, `--bg-surface: #FFFFFF`,
  `--inner-shadow: inset 0 4px 12px rgba(0,0,0,0.08)`.

> Note: light mode's inner shadow is very subtle (`rgba(0,0,0,0.08)`), so the
> active option is less pronounced in light mode than in dark mode.