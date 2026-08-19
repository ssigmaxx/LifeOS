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
      redirect(next);
    }
  }

  // Custom templates using {{ .TokenHash }} land here instead.
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/login?error=Your link is invalid or has expired.");
}
