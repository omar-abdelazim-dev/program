# Program Platform — Backend Performance & Security Audit

> **Status:** Proposed recommendations only. **Nothing has been implemented.**
> This document is an advisory review of the existing backend. All comments are
> superseded by the authoritative source files in `server/`.

---

## Performance

### 1. Rate limiting is in-memory only
`express-rate-limit` uses its default in-memory store. Won't work across multiple
server instances/processes and resets on restart.
→ Use `rate-limit-redis` / a shared store so limits survive restarts and scale
horizontally.

> Bigger win: `globalApiLimiter` at 200/15min means a single CDN/corporate NAT IP
> can throttle all legit users — consider keying by **IP + User-Agent**, and
> excluding static-ish GETs.

### 2. `getCourseById` — N+1 / sequential I/O
`courseController.js:287-292`:
- Queries Sections, then maps to ids, then queries Lessons — **three round trips**
  when course + sections + lessons could be one query with
  `.populate('sections', { lessons: ... })` or a single aggregate.
- Alternatively run the two sub-queries in parallel with `Promise.all`.

### 3. `attachReviewStats` — second full query per catalog request
`courseController.js:13` — called on every `GET /api/courses` (even paginated) and
every page load.
→ Denormalize `avgRating` / `reviewsCount` onto `Course` (update on review create),
or compute once and cache.

### 4. No cursor-based pagination
`.skip()/limit()` degrades as collections grow (skip sized large on each page).
For feed-like lists use the `_id < cursor` pattern.
OK at MVP scale for now.

### 5. `protect` hits the DB on every request
`authMiddleware.js:33` — every protected request pays a `findById`.
Consider a 1–5s Redis/user cache (keyed by id) with invalidation on role/block
changes, or move role into a short-lived signed JWT claim and only re-check
`isBlocked` cheaply.

### 6. Missing indexes
These will bite at scale. **Add compound indexes matching the actual `find`**
filters:
- `Course { status, college, major, semester }` (catalog filter)
- `Course { instructor } + status`
- `Lesson { section }`
- `Section { course }`
- `Enrollment { student, createdAt }`
- `Review { course }`

`Enrollment` already has the correct unique compound index.

### 7. `getInstructorStats` — heavy aggregations per dashboard load
Runs 2 heavy `$lookup` aggregations per load. Fine now, but cache the result
(30–60s) — dashboard stats rarely need to be real-time.

### 8. No response compression
Add a `compression` (gzip) middleware — cheap win for JSON lists and the ~1.2 MB
JS bundle.

---

## Security

### Already solid ✅
- Helmet with strict CSP, HSTS, frameguard, noSniff.
- CORS origin whitelist + credentials, `mongo-sanitize` + `xss-sanitize`,
  `express-validator` on many routes.
- bcrypt cost 12, `select: false` on password, model-level hashing.
- HTTP-only + signed + sameSite/secure cookies, **double-submit CSRF** token
  (rare in MVPs — good).
- `authLimiter` / `loginLimiter` / `registerLimiter` / `forgotPasswordLimiter` /
  `otpLimiter` on sensitive routes.
- Approval workflow (courses must be approved before public), ownership checks,
  no client-trusted role/price/status.

### Gaps / improvements

1. **Rate limiters don't apply to protected non-auth routes** — e.g.
   `PATCH /api/admin/users/:id/role` or heavy course endpoints only get the global
   200/15min. Sensitive admin mutations should get their own tighter limiter.

2. **Rate limiting misses per-user cost** — a single superadmin could self-DoS.
   Consider identity-aware limiters (keyed by `req.user.id`).

3. **`getCourseById` leaks status logic** — 404 vs 403 confuses ownership for
   non-approved courses (minor). Also `course.instructor._id` is accessed via
   `.populate` after `findById` — if a course has no owner the code could crash
   → guard nullable.

4. **Email enumeration** — `checkEmail` reveals whether an email exists
   (deliberate, for register UX). It IS an oracle. Consider moving uniqueness
   messaging behind a generic response unless needed for the UX.

5. **CORS preflight** — status is handled by `cors`. Fine.

6. **`updateCourse` ignores `price`** — good (no mass-assign risk, whitelisted
   fields). Just confirm `semester` etc. are validated upstream in
   `courseValidators`.

7. **Upload surface** (`multer` + Cloudinary via **memory buffer**, `upload.js`)
   — risks:
   - No file-type allowlist beyond extension.
   - No apparent per-upload byte limit.
   - Memory buffer → untrusted large uploads can **OOM the process**.
   → Add: **MIME/magic-byte validation, hard size cap, stream to Cloudinary**
   (not full memory buffer), **Cloudinary signed uploads**, **per-IP upload
   limiter**.

8. **Admin write brute-force** — ensure `systemConfigRoutes` and `adminRoutes`
   mutations have a **write-limiter**.

9. **Cookie `secure` only in production** — in dev over HTTP the token cookie
   can be captured by a network MITM. Consider always `secure: true` (or behind a
   flag set in staging+prod), and set cookie `domain` explicitly.

10. **No token `jti` / revocation** — can't kill a specific stolen session, and
    `resetPassword` / `changePassword` don't invalidate other active JWTs.
    You already store `passwordChangedAt` — **put it in the JWT payload and
    compare in `protect`** → invalidates all sessions after a password change
    for free.

11. **Logging raw reset link** — `authController.js` logs a raw reset token
    (credential-in-plaintext in logs). Log only the user id / mask the token.

12. **`sameSite:'none'` + `secure` requires HTTPS** — otherwise some browsers
    reject the cookie entirely and login silently won't persist. **Confirm prod
    is HTTPS.**

13. **CSRF** — with `sameSite:'none'`, double-submit CSRF (readable cookie) is
    acceptable; a stronger pattern is verifying an **Origin/Referer** header on
    mutation requests.

14. **Validator reach** — `express-validator` is present; confirm it actually runs
    on every route (some controllers only do manual checks). Add schema validation
    to all `req.params.id` to validate ObjectId early (prevents error-throwing
    paths).

15. **`isBlocked` / `isDeleted`** — handled in `protect`; good. A blocked user's
    previously-issued JWT is already invalidated because `authMiddleware`
    re-fetches the user on each request. ✅

---

## My Top 5 to do first

1. **Upload hardening** — MIME sniffing, byte cap, stream not memory (highest
   real-world risk).
2. **Redis-backed rate limiting** + per-user & write-endpoint limiters.
3. **Stop logging plaintext reset links.**
4. **Invalidate sessions on password change** (use `passwordChangedAt` in JWT).
5. **Indexes + reduce N+1** in course fetching, and cache
   `attachReviewStats` / stats-list aggregations.

---

_Next agent: re-verify any change against the actual `server/` code and run
`node test-integration.js` in `server/` after implementing._