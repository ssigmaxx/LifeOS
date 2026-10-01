import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // googleca03f0e518a70229.html is a Google Search Console domain
    // ownership verification file (public/) — must be reachable by Google's
    // unauthenticated crawler with no redirect, same as sw.js/offline.html.
    "/((?!api/|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|sw.js|offline.html|googleca03f0e518a70229\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
