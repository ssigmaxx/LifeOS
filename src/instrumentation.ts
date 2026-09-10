import * as Sentry from "@sentry/nextjs";

// Next.js's instrumentation hook — register() runs once per runtime on cold
// start, before any request is handled. onRequestError is a separate hook
// Next.js calls automatically on any uncaught error in a Server Component,
// Route Handler, or Server Action — this is what makes Sentry capture
// "everything that would otherwise only show up as an unread Vercel log
// line" without needing a try/catch added to every route by hand.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
