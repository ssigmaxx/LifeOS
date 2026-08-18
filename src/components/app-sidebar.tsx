"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNav } from "@/lib/nav";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:bg-sidebar md:text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 px-6">
        <Sparkles className="size-5 text-primary" />
        <span className="text-lg font-semibold tracking-tight">LifeOS</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {primaryNav.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
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
        })}
      </nav>
      <div className="flex items-center justify-between border-t px-4 py-3">
        <span className="text-xs text-sidebar-foreground/60">Theme</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
