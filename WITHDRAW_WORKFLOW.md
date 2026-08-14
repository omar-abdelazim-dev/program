# Withdraw Workflow — Complete Technical Documentation

> **Branch:** `feature/withdraw-workflow`  
> **Repository:** `omar-abdelazim-dev/program`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Database Models](#database-models)
4. [Payout Status State Machine](#payout-status-state-machine)
5. [API Routes — Instructor (Payout Flow)](#api-routes--instructor-payout-flow)
6. [API Routes — Admin (Management)](#api-routes--admin-management)
7. [Controller Logic](#controller-logic)
8. [Utilities — OTP & Email](#utilities--otp--email)
9. [Frontend Components](#frontend-components)
10. [Email Notifications](#email-notifications)
11. [Security Mechanisms](#security-mechanisms)
12. [Environment Variables](#environment-variables)
13. [Full End-to-End Flow](#full-end-to-end-flow)

---

## Overview

The **Withdraw Workflow** is a full-stack, multi-step payout system that allows instructors to request earnings withdrawals, verify their identity via an OTP email, and receive payments. Admins can review, approve, or reject requests from a dedicated management portal, with automated email notifications sent at each outcome.

**Key Features:**
- Instructor-initiated payout request with method selection (Vodafone Cash, Orange Cash, etc.)
- 6-digit HMAC-SHA256 OTP sent to a chosen email for identity verification
- Tiered approval: small payouts auto-approve, large payouts (`≥ EGP 5,000`) require admin sign-off
- Admin portal with Revenue Trace to audit all enrollments generating the requested balance
- Automated approval/rejection email sent to the instructor
- Full immutable audit log of every state transition

---

## Architecture Diagram

```
[Instructor Portal]
       │
       ├── 1. POST /api/financials/payout          → Create payout_request (status: pending)
       │
       ├── 2. POST /api/payouts/:id/request-otp    → Generate OTP, send email
       │
       └── 3. POST /api/payouts/:id/verify-otp     → Verify OTP
                    │
                    ├── Amount < 5,000 EGP → status: approved (auto)
                    └── Amount ≥ 5,000 EGP → status: otp_verified (awaits admin)

[Admin Portal]
       │
       ├── GET  /api/admin/payouts                 → List all pending payouts
       ├── GET  /api/admin/payouts/:id/revenue-trace → Show enrollment audit
       ├── PUT  /api/financials/:id/complete        → Mark as paid (sends Approval email)
       └── PUT  /api/financials/:id/reject          → Reject with reason (sends Rejection email)
```

---

## Database Models

### `Transaction` — `server/models/Transaction.js`

The central model for all financial activity. Both course sales and payout requests are stored here.

| Field | Type | Description |
|---|---|---|
| `instructor` | ObjectId → User | Owner of this transaction |
| `amount` | Number | Positive for sales, **negative** for payouts |
| `type` | `course_sale` \| `payout_request` | Transaction category |
| `status` | String (enum) | See [State Machine](#payout-status-state-machine) |
| `description` | String | Human-readable label |
| `payoutMethod` | String (enum) | `vodafone_cash`, `orange_cash`, `etisalat_cash`, `we_cash`, `instapay` |
| `payoutDetails` | String | Phone number / account ID — **erased after payment** |
| `payoutEmail` | String | The email used for OTP verification |
| `requiresSecondApproval` | Boolean | `true` if amount ≥ threshold (5,000 EGP) |
| `otpVerifiedAt` | Date | Timestamp of successful OTP verification |
| `approvedBy` | ObjectId → User | Admin who approved (second approver) |
| `approvedAt` | Date | Timestamp of admin approval |
| `idempotencyKey` | String (unique) | UUID to prevent double execution |
| `expectedFees` | Number | Calculated 2% platform fee |
| `expectedPayout` | Number | Net amount after fees |
| `actualFee` | Number | Real fee applied by admin on completion |
| `actualPayout` | Number | Real net amount paid |
| `referenceId` | String | Invoice ID (format: `INV-XXXXX-XXXXXX`) |
| `rejectionReason` | String | Admin's rejection reason, sent to instructor |
| `availableAt` | Date | Settlement date for course sales (14-day hold) |
| `failureReason` | String | Error description on `failed` status |
| `providerTransactionId` | String | External payment provider reference |

**Status Enum:** `pending` → `otp_verified` → `approved` → `processing` → `paid` | `cleared` | `failed` | `rejected`

---

### `PayoutOTP` — `server/models/PayoutOTP.js`

Stores the temporary OTP record for each payout request. Only one active OTP per payout (unique index on `payoutRequestId`).

| Field | Type | Description |
|---|---|---|
| `payoutRequestId` | ObjectId → Transaction | The payout being verified (unique) |
| `email` | String | Email address the OTP was sent to |
| `otpHash` | String (hidden) | HMAC-SHA256 of the raw code — **never returned in queries** |
| `attempts` | Number | Number of wrong guesses so far |
| `maxAttempts` | Number | Maximum allowed attempts (default: 5) |
| `expiresAt` | Date | Code expiry time (default: 10 minutes) |
| `resendAvailableAt` | Date | When a new OTP can be requested (60s cooldown) |
| `usedAt` | Date | Set on successful verification (idempotency guard) |

> **Auto-cleanup:** A MongoDB TTL index on `expiresAt` auto-deletes expired OTP documents.

---

### `PayoutAuditLog` — `server/models/PayoutAuditLog.js`

An **immutable** audit trail. One document per event. Never updated or deleted.

| Field | Type | Description |
|---|---|---|
| `payoutRequestId` | ObjectId → Transaction | Associated payout |
| `action` | String (enum) | Event name (see below) |
| `actorId` | ObjectId → User | Who triggered the action |
| `ipAddress` | String | Requester's IP |
| `metadata` | Mixed | Arbitrary context (attempt counts, emails, amounts) |

**Logged Actions:**
- `otp_requested` — Instructor requested first OTP
- `otp_resent` — Instructor resent OTP
- `otp_failed_attempt` — Wrong code entered
- `otp_max_attempts_exceeded` — Lockout triggered
- `otp_verified` — Correct code entered
- `email_mismatch_flagged` — Instructor used a different email than account email (fraud signal)
- `payout_submitted` — Payout request created
- `payout_approved` — Admin issued second approval
- `payout_executed` — Execution attempted against external provider
- `payout_completed` — Provider confirmed success
- `payout_failed` — Provider returned failure
- `payout_rejected` — Admin rejected the request

---

## Payout Status State Machine

```
                    ┌─────────┐
                    │ pending │  ← Created by instructor
                    └────┬────┘
                         │ POST /api/payouts/:id/verify-otp
                    ┌────▼────────────────────────┐
         amount     │                              │  amount
         < 5000     │       OTP Verified           │  ≥ 5000
         ┌──────────┤                              ├──────────┐
         │          └──────────────────────────────┘          │
         ▼                                                     ▼
   ┌──────────┐                                      ┌──────────────┐
   │ approved │                                      │ otp_verified │ ← Awaits admin
   └────┬─────┘                                      └──────┬───────┘
        │                                                   │ POST /api/payouts/:id/approve
        │ ◄─────────────────────────────────────────────────┘
        │
        │ POST /api/payouts/:id/execute
        ▼
   ┌────────────┐
   │ processing │ ← External provider called
   └─────┬──────┘
         │
    ┌────┴──────────────────────┐
    │                           │
    ▼                           ▼
 ┌──────┐                  ┌────────┐
 │ paid │                  │ failed │
 └──────┘                  └────────┘

 At any non-terminal state:
    └── PUT /api/financials/:id/reject → ┌──────────┐
                                         │ rejected │
                                         └──────────┘
```

---

## API Routes — Instructor (Payout Flow)

### `POST /api/financials/payout`
**Access:** Instructor only  
**Purpose:** Initiate a new payout request.

**Request Body:**
```json
{
  "method": "vodafone_cash",
  "payoutDetails": "01xxxxxxxxx",
  "payoutEmail": "instructor@example.com"
}
```

**Logic:**
1. Validates payout method against allowed list
2. Cancels any existing `pending` requests (abandoned cleanup)
3. Enforces 7-day cooldown between payouts
4. Checks available balance ≥ EGP 100
5. Calculates 2% fee and net payout
6. Auto-generates Invoice ID (`INV-XXXXX-XXXXXX`) and idempotency UUID
7. Creates `Transaction` with `status: "pending"`

**Response (201):**
```json
{
  "message": "Payout request initiated successfully. Please complete email OTP verification.",
  "transaction": { "_id": "...", "referenceId": "INV-...", "status": "pending", ... }
}
```

---

### `POST /api/payouts/:id/request-otp`
**Access:** Instructor only (rate-limited by `otpLimiter`)  
**Purpose:** Generate and email a 6-digit OTP for the payout.

**Request Body:**
```json
{
  "payoutEmail": "email@example.com"
}
```

**Logic:**
1. Verifies instructor owns the payout transaction
2. Checks 60-second resend cooldown
3. Generates a cryptographically secure 6-digit OTP via `crypto.randomInt`
4. Hashes the code using HMAC-SHA256 — **raw code is never stored**
5. Upserts the `PayoutOTP` record (invalidates previous OTP)
6. Flags email mismatch if instructor uses a different email than their account
7. Sends OTP email via Gmail
8. Logs `otp_requested` or `otp_resent` to audit log

**Response (200):**
```json
{
  "message": "Verification code sent to email@example.com",
  "resendAvailableAt": "2026-08-13T...",
  "expiresAt": "2026-08-13T...",
  "emailMismatch": false
}
```

---

### `POST /api/payouts/:id/verify-otp`
**Access:** Instructor only (rate-limited)  
**Purpose:** Verify OTP and advance payout status.

**Request Body:**
```json
{ "code": "123456" }
```

**Logic (wrapped in MongoDB session for atomicity):**
1. Validates 6-digit format
2. Fetches `PayoutOTP` with hidden `otpHash` field
3. Increments `attempts` **before** checking (prevents timing oracle attacks)
4. Timing-safe HMAC comparison via `crypto.timingSafeEqual`
5. Marks OTP as `usedAt` to prevent replay
6. Determines next status:
   - Amount < EGP 5,000 → `approved`
   - Amount ≥ EGP 5,000 → `otp_verified` (needs admin)
7. Creates instructor notification
8. Logs `otp_verified` to audit trail

**Response (200):**
```json
{
  "message": "OTP verified. This payout requires a second approver before execution.",
  "status": "otp_verified",
  "requiresApproval": true
}
```

---

### `GET /api/payouts/:id`
**Access:** Owner instructor or Admin  
**Purpose:** Fetch current payout status.

---

## API Routes — Admin (Management)

### `GET /api/admin/payouts`
**Access:** Admin / Superadmin  
**Purpose:** List all payout requests awaiting admin action.

**Response:**
```json
{
  "payouts": [
    {
      "_id": "...",
      "instructor": { "name": "...", "email": "..." },
      "amount": -285460,
      "expectedPayout": 279750.80,
      "payoutMethod": "orange_cash",
      "payoutDetails": "01xxxxxxxxx",
      "referenceId": "INV-XXXXX-XXXXXX",
      "status": "otp_verified",
      "createdAt": "..."
    }
  ]
}
```

---

### `GET /api/admin/payouts/:id/revenue-trace`
**Access:** Admin / Superadmin  
**Purpose:** Show all student enrollments that generated the requested balance since the instructor's last paid withdrawal.

**Logic:**
1. Finds the payout transaction
2. Finds the instructor's last `paid`/`cleared` payout as the "since date"
3. Fetches all instructor courses
4. Fetches all `approved` enrollments in those courses between `sinceDate` and `payout.createdAt`
5. Sums total revenue

**Response:**
```json
{
  "enrollments": [
    {
      "createdAt": "...",
      "student": { "name": "Ahmed", "email": "..." },
      "course": { "title": "...", "price": 500 },
      "amountPaid": 500,
      "invoiceId": "..."
    }
  ],
  "totalSum": 285460,
  "sinceDate": "2026-07-01T...",
  "payoutDate": "2026-08-13T..."
}
```

---

### `PUT /api/financials/:id/complete`
**Access:** Admin / Superadmin  
**Purpose:** Mark payout as paid (approved by admin in portal).

**Request Body (optional):**
```json
{
  "actualFee": 5709.2,
  "actualPayout": 279750.8,
  "providerTransactionId": "TXN-12345"
}
```

**Logic:**
1. Populates instructor name and email
2. Sets `status: "paid"`, **erases `payoutDetails`** (phone number)
3. Looks up the `PayoutOTP` record to find the exact email the instructor used for OTP
4. Sends **Approval email** to that address
5. Falls back to instructor account email if no OTP record found

---

### `PUT /api/financials/:id/reject`
**Access:** Admin / Superadmin  
**Purpose:** Reject a payout request with a reason.

**Request Body:**
```json
{ "reason": "Invalid bank account details provided." }
```

**Logic:**
1. Sets `status: "rejected"` and stores `rejectionReason`
2. Looks up `PayoutOTP` email (same logic as complete)
3. Sends **Rejection email** including the reason to the instructor

---

### `POST /api/payouts/:id/approve` *(Second Approver)*
**Access:** Admin / Superadmin  
**Purpose:** Second-approver sign-off for large payouts (≥ EGP 5,000).

**Logic:**
- Blocks self-approval (instructor cannot approve their own payout)
- Only acts on `otp_verified` status
- Advances to `approved`

---

### `POST /api/payouts/:id/execute` *(Execution)*
**Access:** Admin / Superadmin  
**Purpose:** Atomically execute an approved payout against the external payment provider.

**Logic:**
- Uses `findOneAndUpdate` to atomically claim `approved → processing` (prevents double execution)
- Calls external provider stub (replace with Paymob / Fawry / Instapay)
- Ambiguous errors (timeouts) reset status back to `approved` for human reconciliation
- Definite failures set `status: "failed"`

---

## Controller Logic

### Balance Calculation — `getAvailableBalance(instructorId)`

Computed via MongoDB aggregation:

```
Available Balance = 
  SUM of all course_sale amounts where availableAt ≤ now
  + SUM of all payout_request amounts where status IN [otp_verified, approved, processing, paid, cleared]
```

> Note: Payout amounts are **negative**, so they reduce the balance.

### Fee Structure

- **Platform fee:** 2% of gross payout amount
- **Net payout:** `amount * 0.98`
- Both `expectedFees` and `expectedPayout` are stored on the transaction at creation time

### Cooldown Rules

- **7-day cooldown** between completed payouts
- Any payout in `otp_verified`, `approved`, or `processing` blocks new requests entirely (can't request while one is active)
- Minimum balance: **EGP 100**

---

## Utilities — OTP & Email

### `server/utils/payoutOtp.js`

#### `generateOtp()`
- Uses `crypto.randomInt(0, 1_000_000)` — a cryptographically secure random number
- Returns zero-padded 6-digit string

#### `hashOtp(code)`
- Returns HMAC-SHA256 hex using `OTP_SECRET` env variable
- The raw code is **never stored**

#### `verifyOtp(candidateCode, storedHash)`
- Timing-safe comparison using `crypto.timingSafeEqual`
- Prevents timing-based oracle attacks

#### `sendPayoutOtpEmail({ toEmail, code, amount, instructorName, emailMismatch })`
- Sends styled HTML email via Gmail (nodemailer)
- Orange gradient header
- Displays payout amount and expiry time
- Includes ⚠️ mismatch warning if email differs from account email

#### `sendPayoutStatusEmail({ toEmail, instructorName, status, reason })`
- Sends approval or rejection notification
- **Green gradient** for approval — "Check your balance now"
- **Red gradient** for rejection — includes the admin's rejection reason
- Email recipient is resolved from the `PayoutOTP` record first (exact email used for verification), falling back to account email

---

## Frontend Components

### `InstructorFinancialsTab.jsx`
The instructor-facing financials page. Shows:
- Available balance (calculated on server)
- Pending balance (in settlement window)
- Transaction history table
- **"Request Payout"** button that opens the payout request form
- Method selector (Vodafone Cash, Orange Cash, etc.)
- Phone/account number input (`payoutDetails`)
- Optional: different email input for receiving the OTP

### `PayoutOtpVerification.jsx`
OTP verification step after payout request is created:
- Shows which email the OTP was sent to
- 6-digit input fields
- Resend button (respects 60-second cooldown, shows countdown timer)
- Error messages with remaining attempts
- Success redirects back to financials tab

### `AdminPayoutsTab.jsx`
Admin-facing payout management UI:

#### Main Table
- Lists all active payout requests with columns:
  - Date, Instructor name, Gross amount, Net amount (after 2% fee), Method, Status badge
- Each row has a **"Review Request"** button

#### Review Modal (3 views)

**View 1: Payout Details**
- Instructor Name, Email, Phone Number, Invoice ID, Net Payout Amount
- Three action buttons in one row:
  - 🟠 **View Revenue Trace** (left) — loads enrollment audit
  - 🔴 **Reject** (right)
  - 🟢 **Approve** (right)
- All buttons disabled while loading

**View 2: Reject Confirmation** (replaces view 1 inline, no second modal)
- Warning text with gross amount
- **Rejection Reason** textarea — this text is sent directly to the instructor via email
- Cancel button → returns to View 1
- Confirm Reject button → calls API and closes modal

**View 3: Revenue Trace**
- Descriptive subtitle with since-date
- Scrollable table of all enrollments:
  - Enrollment Date | Student Name | Invoice ID | Course Price
- Total Generated sum at bottom
- **"← Back to Details"** button → returns to View 1

#### Sidebar Badge
- The "Payout Requests" sidebar item shows a live count badge of active payouts
- Counts statuses: `pending`, `otp_verified`, `approved`, `processing`

---

## Email Notifications

### OTP Verification Email
- **Trigger:** `POST /api/payouts/:id/request-otp`
- **Subject:** `Your Payout Verification Code: XXXXXX`
- **Content:** Code, amount, expiry time, fraud warning if email mismatch
- **Design:** Dark background, orange gradient header

### Approval Email
- **Trigger:** `PUT /api/financials/:id/complete`
- **Subject:** `✅ Your Payout Request has been Approved!`
- **Content:** "Your payout request has been approved. Please check your bank account or wallet balance now."
- **Design:** Green gradient header
- **Recipient:** The exact email used for OTP verification (from `PayoutOTP.email`)

### Rejection Email
- **Trigger:** `PUT /api/financials/:id/reject`
- **Subject:** `❌ Your Payout Request has been Rejected`
- **Content:** "Your payout request has been rejected due to: `[rejection reason]`"
- **Design:** Red gradient header, reason in a highlighted block
- **Recipient:** Same OTP email resolution as approval

---

## Security Mechanisms

| Mechanism | Description |
|---|---|
| HMAC-SHA256 OTP hashing | Raw OTP never stored in DB |
| `select: false` on `otpHash` | Hash not exposed in any default query |
| `crypto.timingSafeEqual` | Prevents timing oracle attacks on OTP comparison |
| Pre-increment attempt count | Prevents timing-based oracle even on invalid codes |
| 5-attempt lockout | Brute-force protection on OTP guessing |
| 60-second resend cooldown | Rate limits OTP requests |
| `otpLimiter` middleware | Express rate limiter on OTP endpoints |
| Self-approval block | Admin cannot approve their own instructor payout |
| Idempotency UUID | Prevents double execution if `/execute` is called twice |
| Ambiguous error handling | Timeouts/network errors reset to `approved` (no auto-retry) |
| `payoutDetails` erasure | Phone number/account number wiped from DB after payment |
| Email mismatch flagging | Logged and warned when instructor uses different email |
| MongoDB session transactions | OTP verification is atomic (prevents race conditions) |

---

## Environment Variables

```env
# OTP Configuration
OTP_SECRET=<strong-random-secret>      # HMAC key for OTP hashing
OTP_EXPIRY_MINUTES=10                  # How long OTP is valid
OTP_RESEND_COOLDOWN_SECONDS=60        # Cooldown between OTP requests

# Payout Configuration
PAYOUT_APPROVAL_THRESHOLD=5000        # Amount above which admin approval is required

# Email (Gmail)
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  # Gmail App Password (not account password)
```

---

## Full End-to-End Flow

```
1. INSTRUCTOR: Clicks "Request Payout" in Financials tab
   └── POST /api/financials/payout
       ├── Validates: method, email, cooldown, balance ≥ 100
       ├── Cancels any stale pending requests
       ├── Calculates: fees (2%), net payout, generates Invoice ID
       └── Creates Transaction (status: pending)

2. INSTRUCTOR: Enters email to receive OTP
   └── POST /api/payouts/:id/request-otp
       ├── Validates: owns the payout, not on cooldown
       ├── Generates: crypto OTP → HMAC hash → stored
       ├── Sends: OTP email with amount + expiry
       └── Logs: otp_requested to audit

3. INSTRUCTOR: Enters the 6-digit code
   └── POST /api/payouts/:id/verify-otp (in MongoDB session)
       ├── Increments attempt count
       ├── Compares: timing-safe hash comparison
       ├── Marks OTP usedAt (replay guard)
       ├── Determines next status (auto-approve OR needs admin)
       ├── Sends instructor a notification
       └── Logs: otp_verified to audit

4. ADMIN: Opens Payouts tab, sees request in list
   └── GET /api/admin/payouts

5. ADMIN: Clicks "Review Request"
   └── Opens modal with: instructor info, invoice ID, net amount

6. ADMIN: Clicks "View Revenue Trace"
   └── GET /api/admin/payouts/:id/revenue-trace
       └── Returns all student enrollments since last payout

7a. ADMIN: Clicks "Approve"
    └── PUT /api/financials/:id/complete
        ├── Sets status: paid
        ├── Erases payoutDetails (phone number)
        ├── Looks up PayoutOTP.email
        └── Sends: ✅ Approval email to instructor

7b. ADMIN: Clicks "Reject" → types reason → "Confirm Reject"
    └── PUT /api/financials/:id/reject
        ├── Sets status: rejected, stores rejectionReason
        ├── Looks up PayoutOTP.email
        └── Sends: ❌ Rejection email with reason to instructor
```
