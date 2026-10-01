import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="" width={28} height={28} priority />
          <span className="text-xl font-semibold tracking-tight">Meridian</span>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Meridian is a private, all-in-one personal life tracker — habits, health, nutrition,
          budgeting, journaling, goals, and more — all in one place, visible only to you.
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
        Privacy Policy
      </Link>
    </div>
  );
}
