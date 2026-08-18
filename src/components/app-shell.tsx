import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <span className="font-semibold tracking-tight">LifeOS</span>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
