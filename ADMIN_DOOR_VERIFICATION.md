# Admin Door Separation Verification

## Backend and session checks

- [x] Admin login is `POST /api/auth/admin/login` and accepts only `admin` users.
- [x] Superadmin login is `POST /api/auth/superadmin/login` and accepts only `superadmin` users.
- [x] JWTs and refresh sessions carry `doorScope` (`admin`, `superadmin`, or `user`).
- [x] Staff middleware rejects legacy/unscoped sessions and mismatched staff scopes.
- [x] Admin credentials are rejected at the superadmin door.
- [x] Superadmin credentials are rejected at the admin door.
- [x] Admin-door sessions are rejected by superadmin-only activity and discount-code routes.
- [x] Shared staff routes explicitly require the matching role and door scope.
- [x] Existing integration coverage passes after updating staff login fixtures.

## Frontend checks

- [x] Admin login page is `/admin/login` with its own login flow.
- [x] Superadmin login page is `/superadmin/login` with its own login flow.
- [x] `/admin` accepts only an admin role with `doorScope: admin`.
- [x] `/superadmin` accepts only a superadmin role with `doorScope: superadmin`.
- [x] Auth refresh failures return staff users to the matching login door.
- [x] Production build passes.

## Regression checks

- [x] Admin, superadmin, course moderation, standalone-lesson moderation, payout, report, system-config, and website-management API coverage remains green.
- [x] Dedicated door unit tests pass.
- [x] Auth security tests pass.
- [x] Frontend lint reports 0 errors and existing warnings remain non-blocking.
- [ ] Browser click-through with live production credentials was not run in this environment; automated API, route, and build checks cover the separation.
