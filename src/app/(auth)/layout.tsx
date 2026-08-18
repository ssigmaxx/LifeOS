import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="flex items-center gap-2">
        <Sparkles className="size-6 text-primary" />
        <span className="text-xl font-semibold tracking-tight">LifeOS</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
