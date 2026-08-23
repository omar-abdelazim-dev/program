# Admin Door Separation Audit

## Shared entry and session points

- `POST /api/auth/login` in `server/routes/authRoutes.js` and `login` in `server/controllers/authController.js` currently authenticate every role.
- `server/utils/generateToken.js` issues the JWT and `token`, `refreshToken`, and `csrfToken` cookies; `server/models/Session.js` stores refresh sessions without a door scope.
- `refresh` in `server/controllers/authController.js` rotates refresh sessions through the same token generator.
- `server/middleware/authMiddleware.js` verifies only the JWT and user role; `authorize()` checks roles but not the entry door.
- `client/src/components/AdminAuthPage.jsx` uses the shared login endpoint and performs a client-only role check after login.
- `client/src/App.jsx` routes both `admin` and `superadmin` to `/admin`; `/auth/admin` is the existing staff login route.

## Backend protected surfaces

- `server/routes/adminRoutes.js`: stats, activity, revenue/analytics, users, transactions, payouts, lessons, enrollments, promo codes, discount codes, and instructor violations. The router is shared; activity and discount codes are superadmin-only.
- `server/routes/courseRoutes.js`: pending/deletion/price-change moderation, course enrollment inspection, unpublish/delete/approve/reject/suspend, and price-change decisions allow both staff roles.
- `server/routes/standaloneLessonRoutes.js`: pending/purchase approval and approve/reject allow both staff roles.
- `server/routes/financialRoutes.js`: payout process/complete/reject allow both staff roles.
- Controllers in `adminController.js`, `courseController.js`, and `standaloneLessonController.js` repeat staff-role checks for ownership, moderation, and management actions.

## Frontend gated surfaces

- `AdminPortal.jsx` is the shared staff layout and calls `/api/admin/*`; it conditionally renders superadmin data/actions.
- `AdminOverviewTab.jsx` conditionally shows superadmin counts; other admin tabs are shared by the existing UI.
- `App.jsx` owns authentication initialization, staff redirects, `/admin` protection, and the shared `/auth/admin` entry.

## Explicit scope policy for the refactor

- Admin door: `/admin/login` and `POST /api/auth/admin/login`; only `admin` users; token scope `admin`.
- Superadmin door: `/superadmin/login` and `POST /api/auth/superadmin/login`; only `superadmin` users; token scope `superadmin`.
- Shared staff APIs accept the matching role and matching scope explicitly.
- Superadmin-only APIs require role `superadmin` and scope `superadmin`.
- General user login remains available for non-staff roles and issues scope `user`; staff roles must use a dedicated door.
- Existing unscoped staff sessions are intentionally invalidated at protected-route checks and require re-login.
