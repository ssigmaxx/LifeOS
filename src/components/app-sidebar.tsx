"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNavSections, settingsNavItem, type NavItem } from "@/lib/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavUser } from "@/components/nav-user";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
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
      {item.label}
    </Link>
  );
}

export function AppSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:bg-sidebar md:text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 px-6">
        <Sparkles className="size-5 text-primary" />
        <span className="text-lg font-semibold tracking-tight">LifeOS</span>
      </div>
      <nav className="flex-1 space-y-4 px-3">
        {primaryNavSections.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="px-3 text-xs font-medium tracking-wide text-sidebar-foreground/50 uppercase">
              {section.label}
            </p>
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>
        ))}
        <div className="space-y-1 border-t border-sidebar-border pt-3">
          <NavLink item={settingsNavItem} active={isActive(settingsNavItem.href)} />
        </div>
      </nav>
      <div className="space-y-2 border-t px-3 py-3">
        <NavUser email={userEmail} />
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-sidebar-foreground/60">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
