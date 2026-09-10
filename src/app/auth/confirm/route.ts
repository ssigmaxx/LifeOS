import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Only ever redirect to a relative in-app path. Without this check, a
// crafted link like /auth/confirm?...&next=https://evil.com (or the
// protocol-relative //evil.com) would bounce a freshly-authenticated user
// straight to an attacker-controlled site right after a trusted auth flow —
// a classic open-redirect phishing vector.
function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

// Password reset needs to continue straight into /update-password with the
// fresh session it just got — that page is where the flow actually
// finishes. Every other case reaching here is a signup confirmation, which
// is already done the moment this succeeds: send them into the app with a
// one-time "you're confirmed" banner instead of silently dropping them in
// with no acknowledgment at all — a silent redirect reads as "nothing
// happened" if literally anything downstream hiccups (an extra render, a
// slow cold start).
//
// This goes to "/" and not "/login": exchangeCodeForSession/verifyOtp
// above already set a valid session, so the very next request IS
// authenticated — and src/lib/supabase/middleware.ts redirects any
// authenticated request to "/login" straight to "/" (dropping query
// params), which would silently swallow a "/login?confirmed=1" target
// before the banner ever rendered.
function afterConfirmRedirect(next: string): string {
  return next === "/update-password" ? next : "/?confirmed=1";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = safeNextPath(searchParams.get("next"));
  const supabase = await createClient();

  // Default Supabase email templates route through their hosted verify
  // endpoint, which redirects back here with a PKCE `code`.
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(afterConfirmRedirect(next));
    }
  }

  // Custom templates using {{ .TokenHash }} land here instead.
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(afterConfirmRedirect(next));
    }
  }

  // A PKCE code (the `code` branch above) is single-use and tied to the
  // browser that started the flow — the single most common reason a real
  // signup or reset link "shows an error" is the code already having been
  // consumed by something else (an email client's link-safety prescanner,
  // or opening the link in a different browser than the one used to sign
  // up), not the account itself being broken. This is worded to reflect
  // that rather than reading as "signup failed."
  const params = new URLSearchParams({
    error:
      "That link didn't work — it may have expired or already been used. If you just signed up or reset your password, try logging in below; it may already be confirmed.",
  });
  redirect(`/login?${params.toString()}`);
}
