import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isCycleTrackingEnabled } from "@/lib/services/cycle-service";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  // isCycleTrackingEnabled() does its own separate auth check internally
  // (a second Supabase Auth round trip beyond the getUser() call right
  // here) — this can't be fully deduped without changing its signature
  // everywhere it's called, but running it and getLocale() alongside the
  // getUser() call below at least stops all three from queuing up one
  // after another on every single authenticated page in the app.
  const [
    {
      data: { user },
    },
    locale,
    cycleTrackingEnabled,
  ] = await Promise.all([supabase.auth.getUser(), getLocale(), isCycleTrackingEnabled()]);
  const dict = getDictionary(locale);

  // The proxy already redirects unauthenticated requests to /login before
  // they reach this layout, so user is expected to be present here.
  return (
    <AppShell userEmail={user?.email ?? ""} locale={locale} dict={dict} cycleTrackingEnabled={cycleTrackingEnabled}>
      {children}
    </AppShell>
  );
}
