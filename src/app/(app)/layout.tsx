import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isCycleTrackingEnabled } from "@/lib/services/cycle-service";
import { getProfile } from "@/lib/services/profile-service";
import { getPendingFriendRequestCount } from "@/lib/services/friend-service";
import { isLockEnabled } from "@/lib/services/lock-service";

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
    pendingFriendRequestCount,
    lockEnabled,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getLocale(),
    isCycleTrackingEnabled(),
    // Falls back instead of throwing: this now runs on every authenticated
    // page, so a profile-table read failing for any reason (most likely a
    // migration adding display_name/avatar_icon/birth_date/gender that
    // hasn't been applied to this database yet) must not take down the
    // entire app — it should just render without a name/icon until it's
    // fixed, the same as before this field existed.
    getProfile().catch(() => ({
      displayName: null,
      avatarIcon: null,
      birthDate: null,
      gender: null,
      email: "",
    })),
    getPendingFriendRequestCount().catch(() => 0),
    // Same reasoning as getProfile() above: falls back to "no lock" rather
    // than throwing if this table/column isn't there yet, since a locked-out
    // app (or a crashed one) would be strictly worse than an app that just
    // doesn't offer the lock feature yet.
    isLockEnabled().catch(() => false),
  ]);
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
      pendingFriendRequestCount={pendingFriendRequestCount}
      lockEnabled={lockEnabled}
    >
      {children}
    </AppShell>
  );
}
