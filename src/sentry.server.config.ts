import * as Sentry from "@sentry/nextjs";

// Server-side (Node runtime) error capture — Server Components, Server
// Actions, Route Handlers, and the cron jobs. No extra PII collection
// beyond Sentry's own defaults (stack trace, request path): this app holds
// health, journal, and cycle-tracking data, so nothing beyond what's needed
// to debug a crash gets opted in here.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
});
