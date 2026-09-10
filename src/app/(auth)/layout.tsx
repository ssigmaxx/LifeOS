import type { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="flex items-center gap-2">
        <Image src="/logo-mark.png" alt="" width={28} height={28} priority />
        <span className="text-xl font-semibold tracking-tight">Meridian</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
