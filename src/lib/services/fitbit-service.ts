import "server-only";
import { createClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function requireGoogleHealthEnv() {
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  const scope = process.env.GOOGLE_HEALTH_SCOPES;
  if (!clientId || !clientSecret || !scope) {
    throw new Error("Google Health API isn't configured (missing env vars).");
  }
  return { clientId, clientSecret, scope };
}

export function buildAuthorizationUrl(redirectUri: string, state: string) {
  const { clientId, scope } = requireGoogleHealthEnv();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const { clientId, clientSecret } = requireGoogleHealthEnv();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  }
  const json = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };
  return json;
}

export async function saveFitbitTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}) {
  const { supabase, userId } = await requireUserId();
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
  const { error } = await supabase.from("fitbit_connections").upsert({
    user_id: userId,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    scope: tokens.scope,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function isFitbitConnected(): Promise<boolean> {
  const { supabase, userId } = await requireUserId();
  const { count, error } = await supabase
    .from("fitbit_connections")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function disconnectFitbit() {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("fitbit_connections").delete().eq("user_id", userId);
  if (error) throw error;
}
