"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Only fires if an error escapes the entire app layout tree itself (rather
// than a page within it, which (app)/error.tsx already catches) — rare, but
// without this file such a crash reports to Sentry via onRequestError with
// no user-facing fallback at all, just a blank page.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>Something went wrong</p>
        <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
          This has been reported automatically.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            borderRadius: "0.375rem",
            border: "1px solid #ccc",
            background: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
