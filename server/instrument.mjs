import * as Sentry from '@sentry/node';

// Error tracking is opt-in: local development and CI do not send telemetry.
// Configure SENTRY_DSN in Render/Vercel only after creating the project.
if (process.env.SENTRY_DSN) {
  const requestedSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1);
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: Number.isFinite(requestedSampleRate) && requestedSampleRate >= 0 && requestedSampleRate <= 1
      ? requestedSampleRate
      : 0.1,
    sendDefaultPii: false,
  });
}
