### Finding 1 — Course deletion restricted to admin (NOT a bug — confirmed by design)

**Status:** Verified, working as intended.

**What we saw:**

```
DELETE /api/courses/6a79c9e250d43dff554b1bc4 → 403
{"message":"Role 'instructor' is not authorized to access this resource"}
```

**Where in code:** `server/routes/courseRoutes.js`

```js
router.delete('/:id', protect, authorize('admin', 'superadmin'), deleteCourse);
router.patch('/:id/request-delete', protect, authorize('instructor'), requestDeleteCourse);
```

**Explanation:** Instructors don't get direct delete rights. They can only flag `deletionRequested: true` via `request-delete`, and an admin has to actually delete it (`rejectDeletionRequest` also exists as the admin's "no" path). This is deliberate — it stops an instructor from unilaterally nuking a course with paying enrolled students. Not a vulnerability. If this is actually surprising/undesired product behavior for your team, that's a product decision to raise with whoever owns the requirements — not a security fix.

---

### Finding 2 — Document upload endpoint has no real content validation

**Status:** Confirmed via code review. XSS/malicious-file test on this specific endpoint was not completed yet (you tested the `/uploads/image` SVG path, which Cloudinary sanitized — `/uploads/document` is untested and uses a different Cloudinary pipeline with no sanitization).

**Where in code:** `server/middleware/upload.js`

js

```js
export const uploadDocumentFile = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      return cb(new Error('Videos should be uploaded via the video endpoint'));
    }
    cb(null, true); // <-- everything else passes
  },
}).single('document');
```

And `server/controllers/uploadController.js`:

js

```js
const result = await streamUpload(req.file.buffer, {
  resource_type: 'raw', // no image-pipeline sanitization applies here
  folder: 'program/documents',
});
```

**The gap:**

- `fileFilter` is a deny-list of exactly one thing (`video/*`) — HTML, JS, SVG, executables, anything else is accepted
- `mimetype` is entirely client-supplied — trivially spoofed, never checked against actual file bytes
- `resource_type: 'raw'` skips Cloudinary's image-pipeline SVG sanitization that neutered your earlier test — raw files are served closer to as-uploaded
- No filename sanitization before it reaches Cloudinary — double extensions (`invoice.pdf.html`), null bytes, path traversal characters in the filename are not stripped

**Actual test still owed (do this next):** upload an `.html` file with an inline `<script>` as a "document," fetch the returned `secure_url` directly, and check the response `Content-Type`/`Content-Disposition` headers. If Cloudinary serves it inline as `text/html` rather than forcing a download, that's confirmed stored-XSS-hosting.

**Recommendation:** see the hardening checklist at the bottom — this is the item that needs it most.

---

### Finding 3 — JWT contains only `userId`; role is resolved fresh from DB per request

**Status:** Confirmed via code review. Correctly implemented, not a vulnerability — noting because you flagged it, but this is actually the _safer_ pattern.

**Where in code:** `server/utils/generateToken.js`

```js
const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
  expiresIn: `${jwtExpirationMinutes}m`,
});
```

`server/middleware/authMiddleware.js`

```js
const user = await User.findById(decoded.userId);
...
req.user = { ..., role: user.role, ... }
```

**Why this is correct, not a gap:** if role were baked into the JWT payload, demoting/blocking a user wouldn't take effect until their token naturally expired — an admin demoted to student would keep admin privileges for up to the full token lifetime (configurable, defaults to 60 min, could be set higher) because nothing re-checks the DB. By re-fetching the user every request, a role change or block takes effect on the _next_ request, not the next login. This is the standard trade-off (extra DB read per request vs. stale authorization state) and the code chose correctly for an app with admin/block actions that need to take effect immediately.

**If you want to report this at all**, frame it as a positive control, not a finding — "role authorization is resolved server-side per-request rather than trusted from token claims, preventing privilege persistence after a role change or block."

---

### Finding 4 — JWT payload contains only `userId`; role resolved from DB per-request

**Status:** Design trade-off — current implementation prioritizes security over raw performance. Team should decide deliberately rather than default to one or the other.

**Where in code:** `server/utils/generateToken.js`

```js
const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
  expiresIn: `${jwtExpirationMinutes}m`,
});
```

`server/middleware/authMiddleware.js`

```js
const user = await User.findById(decoded.userId);
...
req.user = { ..., role: user.role, ... }
```

**Current behavior:** Every authenticated request triggers a DB read to fetch the user's current role, block status, etc., rather than trusting a role claim embedded in the JWT.

**The SWE's point is valid — embedding `role` in the JWT would reduce runtime cost.** Skipping a DB round-trip on every authenticated request is a real, measurable performance win, especially as request volume grows. This isn't a bad argument to raise.

**But it reintroduces a specific security trade-off that needs to be handled deliberately, not silently:**

If `role` moves into the JWT payload, that role becomes **stale for the lifetime of the token** — it stops reflecting the database and instead reflects a snapshot taken at login time. Concretely:

- An admin demotes a user from `instructor` to `student` (or blocks them) → with role-in-DB (current), this takes effect on their _very next request_. With role-in-JWT, it doesn't take effect until their token expires and they're forced to log in again — up to the full configured `JWT_EXPIRES_IN`/`jwtExpiration` window (currently as long as `7d` per `.env.example`, or as short as the admin-configured minutes in `SystemConfig`).
- A user who gets **blocked** (`isBlocked: true`) for abuse could keep acting with their old privileges until the token naturally expires, since nothing forces re-validation against the DB mid-session.
- This is the exact scenario your RBAC testing already exercises (admin block/role-change actions) — moving role into the JWT would make those actions non-immediate.

**Recommendation — don't pick blind, pick with the trade-off explicit:**

**Option A — keep current approach, optimize differently.** The DB call itself is cheap (indexed `findById` on `_id`) — if performance is the actual concern, the fix is usually a Redis/in-memory cache of `userId → {role, isBlocked}` with a short TTL (e.g. 30–60s) invalidated on role-change/block actions, not moving trust into the token. This keeps near-immediate revocation while cutting most of the DB load.

**Option B — put role in the JWT, but shorten the blast radius.** If the team still wants role embedded for simplicity:

- Keep JWT expiry short (minutes, not days) so staleness window is small
- On every admin action that changes a user's role or block status, explicitly invalidate that user's existing tokens — this requires adding a server-side revocation mechanism (e.g. a `tokenVersion` field on the User model, incremented on role change/block, checked against a claim in the JWT on every request). Without this, Option B has no way to force an immediate logout after a block/demote action, which is a meaningful regression from current behavior.

---

### Finding 5 — "Continue Course" shows a black screen (video codec incompatibility, not a security issue)

**Status:** Root cause identified via traffic analysis. Confirmation test (re-upload with a different codec) still pending — recommend running before closing this out.

**Category:** Functional/compatibility bug. **Not a security finding** — no access control, data exposure, or injection issue involved.

**What happened:** As an enrolled student, clicking "Continue Course" to view lesson content resulted in a black screen where the video player should be.

**Root cause:** The lesson's video file was uploaded encoded in **HEVC/H.265** — confirmed directly from the Cloudinary upload response captured during testing:


```json
"video": { "pix_format": "yuv420p", "codec": "hevc", "level": 120, "profile": "Main", ... }
```

Firefox (the browser used for testing) does not support native HEVC/H.265 decoding in the `<video>` element on Windows without a separately purchased Windows codec extension. Chrome has the same limitation by default. When the browser can't decode the video stream, the `<video>` element still mounts and its controls still render — but no frame is ever painted.

**Where in code:** `client/src/components/LearningPortal.jsx`

```jsx
<video
  src={activeVideoUrl}
  controls
  autoPlay
  style={{ width: "100%", height: "100%", objectFit: "contain" }}
/>
```

This sits inside a container with an unconditional black background:

```jsx
<div style={{ width: "100%", background: "#000", aspectRatio: "16/9", ... }}>
```

With no decode failure handling on the `<video>` element, an unplayable codec simply leaves the black container background visible with no error surfaced to the user — indistinguishable from the page being broken.

**Likely trigger:** The test file appears to have originated from a third-party TikTok-download tool (filename pattern `snaptik_...`), which commonly exports HEVC. Any instructor uploading a similarly-encoded phone export would hit the same failure in production.

**Recommendation:**

- **Client-side (quick fix):** add an `onError` handler to the `<video>` element that detects a decode/playback failure and displays a clear message (e.g. "This video format isn't supported by your browser") instead of silently showing black.
- **Server/pipeline (proper fix):** since video already goes through Cloudinary, use Cloudinary's video transformation on ingest to transcode all uploads to H.264 (`video_codec: 'h264'`), guaranteeing universal browser playback regardless of what codec the instructor's source file used.

---
#### Finding 6 — `updateFAQ`: superadmin check fires but doesn't stop execution (real access-control bypass)

**Severity: Medium-High.** This is a genuine bug, not a design trade-off.

**Where:** `server/controllers/websiteController.js`, `updateFAQ`:

js

```js
export const updateFAQ = async (req, res) => {
  try {
    const { status } = req.body;
    if (status && status !== 'active' && req.user.role !== 'superadmin') {
      checkSuperAdmin(req, res); // <-- sends a 403 response, but nothing returns here
      if (status === 'active' || status === 'archived') {
        const check = checkSuperAdmin(req, res);
        if (check) return check;
      }
    }

    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(faq);
  } catch (error) {
    res.status(500).json({ message: 'Error updating FAQ' });
  }
};
```

`checkSuperAdmin` sends a response (`res.status(403).json(...)`) and returns that `res` object — every other call site in this file correctly does `const check = checkSuperAdmin(req, res); if (check) return check;` to stop execution. **Line 91 is the one exception:** it calls `checkSuperAdmin(req, res)` bare, discards the return value, and never returns.

**Real-world effect:** a plain `admin` (not superadmin) sends `PATCH /api/website/faqs/:id` with any `status` value that is neither `'active'` nor `'archived'` (e.g. `"hidden"`, `"draft"`, or any arbitrary string):

1. `checkSuperAdmin` fires and sends a `403` — the client sees a rejection
2. Execution does **not stop** — the inner `if` only covers `'active'`/`'archived'`, so any other status value falls straight through
3. `FAQ.findByIdAndUpdate(req.params.id, req.body, ...)` **still runs and commits the write to the database**
4. The trailing `res.json(faq)` then throws (`ERR_HTTP_HEADERS_SENT`, headers already sent) — the error gets swallowed by the `catch` block, which itself also fails to send a second response, so this fails silently server-side with no visible trace to the client beyond the original 403

**Net effect: the client is told "forbidden," but the write happens anyway.** This is a case where the app _looks_ correctly locked down (client gets a 403) while the restriction is actually bypassed underneath. Test to confirm:

```
PATCH /api/website/faqs/<id> HTTP/1.1
Cookie: token=<plain admin>; csrfToken=...
X-CSRF-Token: ...
Content-Type: application/json

{"status":"archived_typo_or_whatever_status"}
```

Then, separately, fetch `GET /api/website/faqs` and check whether that FAQ's status actually changed despite the 403.

**Fix:** change line 91 to match every other call site in the file:

js

```js
const check = checkSuperAdmin(req, res);
if (check) return check;
```

#### Finding 7 — `createTestimonial` has no status restriction at all (inconsistent enforcement)

**Where:** `server/controllers/websiteController.js`:

js

```js
export const createTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.create(req.body);
    res.status(201).json(testimonial);
  } catch (error) {
    res.status(500).json({ message: 'Error creating testimonial' });
  }
};
```

Compare to `updateTestimonialStatus`, which correctly restricts setting `status` to `'approved'`/`'featured'` to superadmins only. `createTestimonial` has no equivalent check — a plain admin can create a testimonial **directly with `"status":"featured"`** in the initial `POST` body, sidestepping the restriction that only applies on the update path. The business rule ("only superadmin can approve/feature") is enforced inconsistently — closed on one route, open on the other.

**Test:**

```
POST /api/website/testimonials HTTP/1.1
Cookie: token=<plain admin>; csrfToken=...
X-CSRF-Token: ...
Content-Type: application/json

{"name":"test","content":"test","status":"featured"}
```

As plain admin — if this returns `201` with `status: "featured"` set, that's confirmed.

**Fix:** apply the same `checkSuperAdmin` gate in `createTestimonial` whenever `req.body.status` is `'approved'` or `'featured'`, matching the pattern already used in `createAnnouncement` (which does this correctly for `'published'`).

#### Finding 8 — Stored content fields (FAQ answer, testimonial content, announcement body) go through `xssSanitizeMiddleware`, confirm rendering is plain text client-side

Not a confirmed bug — a verification gap. `xssSanitizeMiddleware` (global, in `app.js`) strips HTML tags from all string fields in `req.body`, so raw `<script>` tags shouldn't reach the DB. But since these are **admin-authored public-facing content fields** (FAQ answers, testimonial quotes, announcements — displayed to every visitor on the public site), and there's no `dangerouslySetInnerHTML` anywhere in the client (I checked — confirmed clean), the combination should be safe. Worth one confirmation test since it's public-facing and high-visibility if wrong:

```
POST /api/website/faqs HTTP/1.1
...
{"question":"test","answer":"<img src=x onerror=alert(document.domain)>"}
```

Then view the public FAQ page as a logged-out visitor and confirm the payload renders as literal text, not markup.

---

## File Upload Hardening Checklist

For your dev to implement, ranked by priority. Reference: `server/middleware/upload.js`, `server/controllers/uploadController.js`.

#### Must-fix

- [ ]  **Replace MIME-type trust with magic-byte detection.** Use `file-type` (npm) to sniff the actual binary signature of `req.file.buffer` — reject if the detected type doesn't match an explicit allow-list. Never trust `file.mimetype` from the client alone.
- [ ]  **Switch both filters from deny-list to allow-list.** Currently the document filter blocks one thing and allows everything else — invert this:
    - Images: allow only `image/jpeg`, `image/png`, `image/webp` — **explicitly exclude `image/svg+xml` and `image/gif`** (SVG can carry script/XML entities, animated GIFs are a low-value MVP feature not worth the risk surface)
    - Documents: allow only `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/zip` — explicitly reject `text/html`, `text/javascript`, `image/svg+xml`, `application/x-msdownload`, and anything executable
- [ ]  **Sanitize/regenerate the filename server-side before it touches Cloudinary or any log.** Don't pass `file.originalname` through as-is:
    - Strip null bytes (`\x00`)
    - Reject or strip double extensions (`.pdf.html`, `.jpg.exe`) — check the _last_ extension only, and validate it matches the detected MIME type
    - Reject path traversal characters (`../`, `..\\`, leading `/`)
    - Best practice: discard the original filename entirely for storage purposes, generate a UUID server-side, keep the original name only as display metadata in the DB (never as the actual stored/served filename)
- [ ]  **Force `Content-Disposition: attachment` on document uploads** via Cloudinary's delivery params (`flags: 'attachment'` in the upload options), so raw files download instead of rendering inline in the browser regardless of what type they turn out to be.

#### Should-fix

- [ ]  **Explicitly disable SVG uploads entirely on the image endpoint**, don't rely on Cloudinary's default sanitization remaining in place — that's a platform default you don't control, not your app's guarantee. Reject `image/svg+xml` in your own allow-list even though Cloudinary happens to neuter it today.
- [ ]  **Re-verify file size limits under adversarial conditions** — test with a manipulated `Content-Length` header and chunked transfer-encoding to confirm multer's `limits.fileSize` actually holds, not just under normal browser use.
- [ ]  **Add a dedicated rate limiter to both upload routes.** Right now they only inherit the global 200/15min catch-all — an authenticated instructor account could hammer `/uploads/document` to run up Cloudinary storage/bandwidth costs with no route-specific throttle.
- [ ]  **Strip EXIF/metadata from images on upload** (Cloudinary can do this via upload transformation params) — not a vuln per se, but EXIF GPS data in student-uploaded profile photos is a privacy leak worth closing while you're in this code anyway.

#### Nice-to-have / document as accepted risk if not fixed

- [ ]  **No malware/AV scanning exists anywhere in the pipeline.** Confirm this explicitly in your report as accepted risk if you're not adding one (e.g. ClamAV, or Cloudinary's built-in moderation add-on) — the platform can currently be used to host and distribute arbitrary files behind a trusted-looking URL.
- [ ]  **Validate `videoUrl`/`thumbnailUrl`/`attachmentUrl` server-side when lessons/courses are created** — right now these are free-text strings from the client with zero validation (see the earlier `javascript:alert(...)` test we queued but haven't gotten a result for). At minimum, regex-validate that the URL's host is actually `res.cloudinary.com` before accepting it into the DB.
