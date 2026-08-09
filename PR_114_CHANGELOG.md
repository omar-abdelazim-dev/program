# PR 114: Comprehensive Localization & API Extensions

## Overview
This PR delivers an exhaustive localization overhaul to support full Arabic (RTL) layouts, significantly refines the frontend UI with premium glassmorphic touches, and extends backend controllers to properly handle Q&A, reviews, and notifications.

## Detailed Changelog

### Comprehensive Localization (i18n & RTL)
- **Global RTL Alignment & Flipping:**
  - Implemented dynamic border-radius flipping for Arabic mode (e.g., Q&A instructor reply chat bubbles reverse correctly to `25px 0 25px 25px`).
  - Mirrored navigational icons globally (e.g., applying `scaleX(-1)` to "Back to courses" arrows when `isRTL` is true).
  - Enforced fixed RTL popups: Overrode the global `notyf` toast messages in `index.css` with `!important` to force correct right-side popups globally, even in English mode (per design spec).
- **Extensive Translation Sweeps:** 
  - Thoroughly replaced all hardcoded English strings with dynamic `t()` variables across `AdminUserManagementTab`, `InstructorEngagementTab`, `LearningPortal`, `CoursePage`, `DashboardTab`, and `SettingsPage`.
  - Added new translation dictionary keys in `ar.json` and `en.json` (including states like `loading_questions`, `save`, `cancel`, `sending`, etc.).

### Premium UI & Responsiveness Upgrades
- **Learning Portal Redesign:**
  - **Sidebar:** Converted the vertical-collapse list into a sleek, fully horizontally sliding sidebar (toggling from `280px` down to `0px` with `overflow: hidden`). Reduced the width from `350px` to `280px` to give the main video player more breathing room.
  - **Navbar Toggle:** Integrated a new responsive hamburger toggle button in the top navigation bar to control the sidebar, styled with premium glass-like hovers, drop shadows, and an inner box-shadow pressed state (`var(--bg-main)`). Swapped out the off-center list icon for a perfectly symmetrical hamburger SVG.
  - **Video Section:** Added a clean separator line beneath the main video player to split the structural hierarchy from the overview tabs.
- **Dropdown & Hover Overhauls:** 
  - Updated standard active dropdown options to use deep inner shadows (`inset 0 2px 8px rgba(0, 0, 0, 0.3)`) and solid deep background colors.
  - Profile Menu Tooltip: Restyled the `.tooltip-link` elements in the `TopNav` to feature a smooth, ultra-round `50px` pill-shaped border radius upon hover/active states.
- **Responsive Forms:**
  - **Settings Page:** Refactored the Profile settings input fields to use CSS Grid `auto-fit` with `minmax`. The inputs now dynamically stack into a single column on mobile screens while seamlessly reverting to two columns on desktops.

### Backend & API Extensions

**1. Engagement & Q&A Routes (`server/routes/engagementRoutes.js`)**
- `GET /api/engagement/questions/unread-count`: Fetches the total number of unread/pending student questions for an instructor.
- `PATCH /api/engagement/questions/:id/status`: Allows instructors to flag questions as read/unread or mark them resolved.
- `DELETE /api/engagement/questions/:id/reply`: Lets an instructor delete a reply they previously posted.
- `POST /api/engagement/questions`: Core endpoint for students to ask new questions from the Learning Portal.
- `GET /api/engagement/course/:courseId/questions`: Retrieves the public feed of questions for a specific course video.
- `PATCH /api/engagement/questions/:id`: Allows students to edit their question (only if it is still pending a reply).
- `DELETE /api/engagement/questions/:id`: Allows a student to delete their own question, or an instructor to moderate/delete it.

**2. Notifications Routes (`server/routes/notificationRoutes.js`)**
- `GET /api/notifications/`: Fetches the logged-in user's personalized notification history.
- `PATCH /api/notifications/:id/read`: Marks a specific notification as "read" so it clears from the unread badge counter.

**3. Review Routes (`server/routes/reviewRoutes.js`)**
- `PUT /api/reviews/:id`: Allows a student to edit a review they previously submitted.
- `DELETE /api/reviews/:id`: Allows a student to delete their review.
- `GET /api/reviews/course/:id`: Public endpoint fetching all approved reviews for a specific course page.

**4. User Profile Routes (`server/routes/userRoutes.js`)**
- `GET /api/users/:id/profile`: Fetches safe, public-facing profile data for a specific user.
- `GET /api/users/:id/enrollments`: Retrieves the list of public course enrollments/progress for a student profile.

**5. Uploads & Media (`server/routes/uploadRoutes.js`)**
- `GET /api/uploads/video-signature`: Replaced the heavy POST /video endpoint. This endpoint securely hands out a cryptographic signature so the client browser can upload the video directly to Cloudinary without stressing the server.

### Structural & Bug Fixes
- **JSX Health Check:** Successfully resolved multiple unbalanced `<div>` tags in the `LearningPortal.jsx` created by heavy structural shifts, ensuring successful `npm run build` production bundles.
- **New Pages:** Initialized and scaffolded the `StudentProfilePage.jsx` for public-facing student profiles.
- **Database Schemas:** Expanded `Notification` and `Question` Mongoose models to safely track advanced interaction histories.
