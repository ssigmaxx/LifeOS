import type { LucideIcon } from "lucide-react";

export function PlaceholderSection({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs">{hint}</p>
      </div>
    </div>
  );
}
