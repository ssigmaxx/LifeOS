import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({
  icon: Icon,
  title,
  stats,
}: {
  icon: LucideIcon;
  title: string;
  stats: { label: string; value: string }[];
}) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">{title}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-2 gap-y-1">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="text-sm font-medium tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
