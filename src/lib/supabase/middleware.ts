import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /privacy stays public (not auth-gated like the other entries here, which
// redirect a signed-in visitor away) since it needs to be reachable by
// logged-out visitors, Google's OAuth consent screen reviewers, and anyone
// who isn't a user at all — see the isPublicPath/isLegalPath split below.
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password"];
const PUBLIC_LEGAL_PATHS = ["/privacy"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Required: refreshes the auth token and must run before any route logic.
  // Do not add code between createServerClient and this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isPublicLegalPath = PUBLIC_LEGAL_PATHS.some((path) => pathname.startsWith(path));
  const isAuthRoute = pathname.startsWith("/auth/");

  if (isPublicLegalPath) {
    return supabaseResponse;
  }

  if (!user && !isPublicPath && !isAuthRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}
