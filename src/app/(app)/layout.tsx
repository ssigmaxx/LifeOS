import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isCycleTrackingEnabled } from "@/lib/services/cycle-service";
import { getProfile } from "@/lib/services/profile-service";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  // isCycleTrackingEnabled() and getProfile() each do their own separate
  // auth check internally (a Supabase Auth round trip beyond the getUser()
  // call right here) — this can't be fully deduped without changing their
  // signatures everywhere they're called, but running them and getLocale()
  // alongside the getUser() call below at least stops them all from
  // queuing up one after another on every single authenticated page.
  const [
    {
      data: { user },
    },
    locale,
    cycleTrackingEnabled,
    profile,
  ] = await Promise.all([supabase.auth.getUser(), getLocale(), isCycleTrackingEnabled(), getProfile()]);
  const dict = getDictionary(locale);

  // The proxy already redirects unauthenticated requests to /login before
  // they reach this layout, so user is expected to be present here.
  return (
    <AppShell
      userEmail={user?.email ?? ""}
      displayName={profile.displayName}
      avatarIcon={profile.avatarIcon}
      locale={locale}
      dict={dict}
      cycleTrackingEnabled={cycleTrackingEnabled}
    >
      {children}
    </AppShell>
  );
}
