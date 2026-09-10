"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { primaryNavSections, settingsNavItem, type NavItem } from "@/lib/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NavUser } from "@/components/nav-user";
import { LockButton } from "@/components/app-lock";
import { CommandPaletteTrigger } from "@/components/command-palette";
import type { Locale } from "@/lib/i18n/locale";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Client components can only receive serializable props from a Server
// Component — the full Dictionary has function values (pluralization
// helpers) elsewhere in its tree, so only the plain-string `nav`/`common`
// slices cross that boundary, never the whole dict.
type NavDict = Dictionary["nav"];

function NavLink({
  item,
  active,
  nav,
  badgeCount,
}: {
  item: NavItem;
  active: boolean;
  nav: NavDict;
  badgeCount?: number;
}) {
  const isCycle = item.href === "/cycle";
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isCycle
          ? active
            ? "bg-pink-500/15 text-pink-600 dark:text-pink-400"
            : "text-pink-600/70 hover:bg-pink-500/10 hover:text-pink-600 dark:text-pink-400/70 dark:hover:text-pink-400"
          : active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <item.icon className={cn("size-4 shrink-0", isCycle && "text-pink-500 dark:text-pink-400")} />
      <span className="flex-1">{nav[item.labelKey]}</span>
      {badgeCount ? (
        <span className="flex min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

export function AppSidebar({
  userEmail,
  displayName,
  avatarIcon,
  locale,
  nav,
  themeLabel,
  cycleTrackingEnabled,
  pendingFriendRequestCount,
}: {
  userEmail: string;
  displayName?: string | null;
  avatarIcon?: string | null;
  locale: Locale;
  nav: NavDict;
  themeLabel: string;
  cycleTrackingEnabled: boolean;
  pendingFriendRequestCount: number;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const visibleSections = primaryNavSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.href !== "/cycle" || cycleTrackingEnabled),
  }));

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:bg-sidebar md:text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 px-6">
        <Image src="/logo-mark.png" alt="" width={22} height={22} priority />
        <span className="text-lg font-semibold tracking-tight">Meridian</span>
      </div>
      <div className="px-3 pb-2">
        <LanguageSwitcher locale={locale} className="w-full" />
      </div>
      <div className="px-3 pb-3">
        <CommandPaletteTrigger />
      </div>
      <nav className="flex-1 space-y-4 px-3">
        {visibleSections.map((section) => (
          <div key={section.labelKey} className="space-y-1">
            <p className="px-3 text-xs font-medium tracking-wide text-sidebar-foreground/50 uppercase">
              {nav[section.labelKey]}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                nav={nav}
                badgeCount={item.href === "/friends" ? pendingFriendRequestCount : undefined}
              />
            ))}
          </div>
        ))}
        <div className="space-y-1 border-t border-sidebar-border pt-3">
          <NavLink item={settingsNavItem} active={isActive(settingsNavItem.href)} nav={nav} />
        </div>
      </nav>
      <div className="space-y-2 border-t px-3 py-3">
        <NavUser email={userEmail} displayName={displayName} avatarIcon={avatarIcon} />
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-sidebar-foreground/60">{themeLabel}</span>
          <div className="flex items-center gap-1">
            <LockButton />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}
