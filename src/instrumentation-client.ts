import * as Sentry from "@sentry/nextjs";

// Browser-side error capture. Deliberately no Session Replay integration:
// this app renders health, journal, and cycle-tracking data, and recording
// DOM/interaction replays of those screens isn't a tradeoff to make
// silently — skip it unless explicitly asked for later.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
