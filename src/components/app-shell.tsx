import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CommandPaletteProvider, CommandPaletteTrigger } from "@/components/command-palette";
import { AppLockProvider, LockButton } from "@/components/app-lock";
import type { Locale } from "@/lib/i18n/locale";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function AppShell({
  children,
  userEmail,
  displayName,
  avatarIcon,
  locale,
  dict,
  cycleTrackingEnabled,
  pendingFriendRequestCount,
  lockEnabled,
}: {
  children: ReactNode;
  userEmail: string;
  displayName?: string | null;
  avatarIcon?: string | null;
  locale: Locale;
  dict: Dictionary;
  cycleTrackingEnabled: boolean;
  pendingFriendRequestCount: number;
  lockEnabled: boolean;
}) {
  return (
    <AppLockProvider lockEnabled={lockEnabled}>
      <CommandPaletteProvider>
        <div className="flex min-h-svh w-full">
          <AppSidebar
            userEmail={userEmail}
            displayName={displayName}
            avatarIcon={avatarIcon}
            locale={locale}
            nav={dict.nav}
            themeLabel={dict.common.theme}
            cycleTrackingEnabled={cycleTrackingEnabled}
            pendingFriendRequestCount={pendingFriendRequestCount}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 items-center justify-between gap-2 border-b px-4 md:hidden">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <span className="font-semibold tracking-tight">Meridian</span>
              </div>
              <div className="flex items-center gap-1.5">
                <LanguageSwitcher locale={locale} className="h-8 w-auto gap-1 px-2 text-xs" />
                <CommandPaletteTrigger variant="icon" />
                <LockButton />
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
              <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
                {children}
              </div>
            </main>
          </div>
          <MobileNav
            userEmail={userEmail}
            displayName={displayName}
            avatarIcon={avatarIcon}
            nav={dict.nav}
            cycleTrackingEnabled={cycleTrackingEnabled}
            pendingFriendRequestCount={pendingFriendRequestCount}
          />
        </div>
      </CommandPaletteProvider>
    </AppLockProvider>
  );
}
