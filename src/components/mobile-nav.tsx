"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileNav, moreNav } from "@/lib/nav";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavUser } from "@/components/nav-user";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Only the plain-string nav slice crosses the Server->Client boundary —
// see the comment in app-sidebar.tsx for why the full Dictionary can't.
type NavDict = Dictionary["nav"];

export function MobileNav({
  userEmail,
  displayName,
  avatarIcon,
  nav,
  cycleTrackingEnabled,
  pendingFriendRequestCount,
}: {
  userEmail: string;
  displayName?: string | null;
  avatarIcon?: string | null;
  nav: NavDict;
  cycleTrackingEnabled: boolean;
  pendingFriendRequestCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visibleMoreNav = moreNav.filter((item) => item.href !== "/cycle" || cycleTrackingEnabled);
  const moreActive = visibleMoreNav.some((item) => pathname.startsWith(item.href));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {mobileNav.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {nav[item.labelKey]}
          </Link>
        );
      })}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
                moreActive ? "text-primary" : "text-muted-foreground",
              )}
            />
          }
        >
          <span className="relative">
            <Menu className="size-5" />
            {pendingFriendRequestCount > 0 ? (
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-red-500" />
            ) : null}
          </span>
          {nav.more}
        </SheetTrigger>
        <SheetContent side="bottom" className="pb-8">
          <SheetHeader>
            <SheetTitle>{nav.more}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 px-4">
            {visibleMoreNav.map((item) => {
              const isCycle = item.href === "/cycle";
              const isFriends = item.href === "/friends";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-accent",
                    isCycle && "border-pink-500/30 text-pink-600 dark:text-pink-400",
                  )}
                >
                  {isFriends && pendingFriendRequestCount > 0 ? (
                    <span className="absolute top-2 right-2 flex min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                      {pendingFriendRequestCount > 9 ? "9+" : pendingFriendRequestCount}
                    </span>
                  ) : null}
                  <item.icon className={cn("size-5", isCycle && "text-pink-500 dark:text-pink-400")} />
                  {nav[item.labelKey]}
                </Link>
              );
            })}
          </div>
          <div className="border-t px-4 pt-4">
            <NavUser email={userEmail} displayName={displayName} avatarIcon={avatarIcon} />
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
