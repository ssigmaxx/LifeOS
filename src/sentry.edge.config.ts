import * as Sentry from "@sentry/nextjs";

// Runs in the Edge runtime — src/proxy.ts today, and any route that later
// opts into `export const runtime = "edge"`.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
});
