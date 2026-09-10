import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Every Supabase call the browser itself makes is an <img> load of a
// signed storage URL (photo thumbnails/originals) — everything else
// (auth, DB reads/writes, Gemini) goes through server actions, so the
// browser never talks to Supabase or Google directly. That keeps this CSP
// tight: only the Supabase project host needs an explicit allowance, and
// only for images.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // Next.js inlines a small hydration/RSC bootstrap script with no nonce
  // wiring configured; Turbopack's dev HMR client also needs 'unsafe-eval'.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${supabaseOrigin}`.trim(),
  "font-src 'self' data:",
  // Dev-only: Turbopack's HMR client holds a WebSocket back to the dev
  // server. Nothing in production ever needs it — no realtime, no
  // browser-side Supabase/Gemini calls.
  `connect-src 'self'${isDev ? " ws: http://localhost:*" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
]
  .join("; ")
  .replace(/\s+/g, " ");

const nextConfig: NextConfig = {
  // Next's Server Action body limit defaults to 1MB — photo uploads go
  // through one (see photo-slot.tsx's form action) and photo-service.ts
  // already validates/rejects raw uploads over 10MB itself, so this just
  // needs enough headroom above that for multipart encoding overhead.
  // Below this, every real phone photo (typically several MB) would be
  // rejected by Next before photo-service.ts ever saw it.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

// disableLogger and automaticVercelMonitors are webpack-plugin options with
// no Turbopack equivalent yet — this project builds with Turbopack (see the
// dev-only comments above), so they're left off rather than set to a value
// that silently does nothing.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  // Routes the browser SDK's error reports through this app's own origin
  // (a route the Sentry build plugin wires up automatically) instead of
  // straight to Sentry's ingest domain — keeps connect-src 'self' in the
  // CSP above exactly as tight as it already was, no third-party exception
  // needed for it.
  tunnelRoute: "/monitoring",
});
