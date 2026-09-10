import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizationUrl } from "@/lib/services/fitbit-service";

const STATE_COOKIE = "fitbit_oauth_state";

async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const origin = await getOrigin();
  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/fitbit",
  });

  let authorizationUrl: string;
  try {
    authorizationUrl = buildAuthorizationUrl(`${origin}/api/fitbit/callback`, state);
  } catch {
    redirect("/settings?fitbit=not_configured");
  }
  redirect(authorizationUrl);
}
