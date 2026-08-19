# Manual payment and enrollment model

Program does not process cards or collect funds through an integrated payment gateway. Paid access uses a manual transfer-and-review workflow.

## Student flow

1. The student chooses an enabled payment method and transfers the exact listed price to the recipient account shown at checkout.
2. The student submits the sender account, transfer/reference ID, and a receipt screenshot.
3. The API creates a `pending` enrollment or standalone-lesson purchase. Pending records do not grant lesson access.
4. An admin compares the submitted proof with the received transfer, then approves or rejects the request.
5. Approval grants access and records the instructor/platform revenue split. Rejection keeps access locked and records the reason.

Free courses and free standalone lessons skip payment review and are approved immediately.

## Configuration

A super admin configures the available methods in **System Management → Financial**:

- Mobile Wallet recipient number
- InstaPay recipient account
- enabled/disabled state for each method
- optional payment instructions shown at checkout
- currency and platform commission

The checkout submit button remains disabled when the selected method has no recipient account configured.

## API contract

Paid requests to `POST /api/enrollments/:courseId` and `POST /api/standalone-lessons/:id/purchase` require:

```json
{
  "transactionId": "transfer-reference",
  "paymentAccount": "+201012345678",
  "paymentMethod": "mobile_wallet",
  "screenshot": "https://.../receipt.jpg",
  "invoiceId": "INV-123456"
}
```

`paymentMethod` is `mobile_wallet` or `instapay`. The screenshot must be an HTTPS URL returned by the authenticated image-upload endpoint. Missing or invalid proof returns `400`; duplicate requests return `409`.

Cart items are submitted one at a time because every paid item has its own transfer and review record.

## Operational rules

- Never approve from the screenshot alone; verify the transfer in the receiving account and match its amount/reference.
- Approval is the entitlement boundary. `pending`, `under_review`, and `rejected` records must never grant content access.
- The displayed course price is the transfer total. There is no student-facing gateway surcharge.
- Refund execution is manual. The existing status can record a refund, but the platform does not move funds automatically.
- Payment receipt images may contain personal information; production retention and private-media access should be reviewed before launch.
