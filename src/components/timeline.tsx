import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Timeline({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}

// A single stop on the timeline: an optional time label on the left, a dot
// connected to the next item by a rail, and free-form content on the right
// so this works both for the plain recap feed and for carbon's interactive
// activity rows (icon, delete button, etc.).
export function TimelineItem({
  time,
  last = false,
  children,
}: {
  time?: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid grid-cols-[62px_16px_1fr] gap-x-3", !last && "pb-4")}>
      <span className="pt-0.5 text-xs text-muted-foreground tabular-nums">{time}</span>
      <span className="flex flex-col items-center">
        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-foreground" />
        {!last ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
      </span>
      <div className="min-w-0 pb-1">{children}</div>
    </div>
  );
}
