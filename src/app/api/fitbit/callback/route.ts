import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { exchangeCodeForTokens, saveFitbitTokens } from "@/lib/services/fitbit-service";

const STATE_COOKIE = "fitbit_oauth_state";

async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (oauthError || !code || !state || !expectedState || state !== expectedState) {
    redirect("/settings?fitbit=error");
  }

  const origin = await getOrigin();
  // redirect() throws internally, so it must never be called inside this
  // try — a catch{} would swallow that throw and turn a successful
  // redirect into a silently-caught "error" page instead.
  let refreshToken: string | undefined;
  let accessToken = "";
  let expiresIn = 0;
  let scope = "";
  try {
    const tokens = await exchangeCodeForTokens(code, `${origin}/api/fitbit/callback`);
    refreshToken = tokens.refresh_token;
    accessToken = tokens.access_token;
    expiresIn = tokens.expires_in;
    scope = tokens.scope;
  } catch {
    redirect("/settings?fitbit=error");
  }

  if (!refreshToken) {
    // Google only issues a refresh token on the first consent, or when
    // prompt=consent forces re-consent (which /connect always sets) — if
    // it's still missing here, something upstream is misconfigured.
    redirect("/settings?fitbit=error");
  }

  try {
    await saveFitbitTokens({ accessToken, refreshToken, expiresIn, scope });
  } catch {
    redirect("/settings?fitbit=error");
  }

  redirect("/settings?fitbit=connected");
}
