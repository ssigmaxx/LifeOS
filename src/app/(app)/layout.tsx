import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already redirects unauthenticated requests to /login before
  // they reach this layout, so user is expected to be present here.
  return <AppShell userEmail={user?.email ?? ""}>{children}</AppShell>;
}
