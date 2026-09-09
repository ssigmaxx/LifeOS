"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNavSections, settingsNavItem, type NavItem } from "@/lib/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NavUser } from "@/components/nav-user";
import { CommandPaletteTrigger } from "@/components/command-palette";
import type { Locale } from "@/lib/i18n/locale";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Client components can only receive serializable props from a Server
// Component — the full Dictionary has function values (pluralization
// helpers) elsewhere in its tree, so only the plain-string `nav`/`common`
// slices cross that boundary, never the whole dict.
type NavDict = Dictionary["nav"];

function NavLink({ item, active, nav }: { item: NavItem; active: boolean; nav: NavDict }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <item.icon className="size-4 shrink-0" />
      {nav[item.labelKey]}
    </Link>
  );
}

export function AppSidebar({
  userEmail,
  locale,
  nav,
  themeLabel,
}: {
  userEmail: string;
  locale: Locale;
  nav: NavDict;
  themeLabel: string;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:bg-sidebar md:text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 px-6">
        <Sparkles className="size-5 text-primary" />
        <span className="text-lg font-semibold tracking-tight">LifeOS</span>
      </div>
      <div className="px-3 pb-2">
        <LanguageSwitcher locale={locale} className="w-full" />
      </div>
      <div className="px-3 pb-3">
        <CommandPaletteTrigger />
      </div>
      <nav className="flex-1 space-y-4 px-3">
        {primaryNavSections.map((section) => (
          <div key={section.labelKey} className="space-y-1">
            <p className="px-3 text-xs font-medium tracking-wide text-sidebar-foreground/50 uppercase">
              {nav[section.labelKey]}
            </p>
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} nav={nav} />
            ))}
          </div>
        ))}
        <div className="space-y-1 border-t border-sidebar-border pt-3">
          <NavLink item={settingsNavItem} active={isActive(settingsNavItem.href)} nav={nav} />
        </div>
      </nav>
      <div className="space-y-2 border-t px-3 py-3">
        <NavUser email={userEmail} />
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-sidebar-foreground/60">{themeLabel}</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
