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

export function MobileNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = moreNav.some((item) => pathname.startsWith(item.href));

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
            {item.label}
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
          <Menu className="size-5" />
          More
        </SheetTrigger>
        <SheetContent side="bottom" className="pb-8">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 px-4">
            {moreNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-accent"
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="border-t px-4 pt-4">
            <NavUser email={userEmail} />
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
