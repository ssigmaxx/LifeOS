import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isCycleTrackingEnabled } from "@/lib/services/cycle-service";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const cycleTrackingEnabled = await isCycleTrackingEnabled();

  // The proxy already redirects unauthenticated requests to /login before
  // they reach this layout, so user is expected to be present here.
  return (
    <AppShell userEmail={user?.email ?? ""} locale={locale} dict={dict} cycleTrackingEnabled={cycleTrackingEnabled}>
      {children}
    </AppShell>
  );
}
