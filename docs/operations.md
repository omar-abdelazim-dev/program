# Production operations

## Logs and error tracking

In production, the API writes structured JSON logs to stdout. Configure the
hosting provider's log retention and alerts for 5xx responses, startup failures,
and `stream: security` events. Do not depend on files inside the running
container: they are ephemeral.

Set `SENTRY_DSN` only in staging/production to report unhandled API errors to
Sentry. Use separate projects (or environments) for staging and production,
keep `sendDefaultPii` disabled, and start with `SENTRY_TRACES_SAMPLE_RATE=0.1`.

## Health and shutdown

- `GET /api/health` is a liveness endpoint: the process can answer HTTP.
- `GET /api/ready` is a readiness endpoint: it requires a live MongoDB
  connection and performs a database ping.
- Render should use `/api/ready` as its health check. The service handles
  `SIGTERM` and `SIGINT`, stops scheduled jobs, closes HTTP connections, then
  closes MongoDB. Its forced-exit timeout is 25 seconds; Render is configured
  to allow 30 seconds.

## Backups and recovery

MongoDB Atlas is the system of record. Before production launch, enable Atlas
continuous/cloud backups for the production cluster, set a retention period,
restrict backup access to operations staff, and record the restore-point target.
Run and document one restore into a separate staging database; never test a
restore against production. Cloudinary media should have its own retention and
recovery policy because a MongoDB restore does not restore uploaded assets.

## Minimum alerts

Configure alerts for a failed Render health check, elevated 5xx rate, MongoDB
connection failures, Sentry new issues, database storage/connection limits, and
failed backups. Assign an owner and escalation contact before accepting real
student payments.
