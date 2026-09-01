import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { IconBadge } from "@/components/icon-badge";
import type { CrossMetricInsight } from "@/lib/services/analytics-service";

const STRENGTH_LABEL: Record<CrossMetricInsight["strength"], string> = {
  weak: "Slight",
  moderate: "Moderate",
  strong: "Strong",
};

function InsightRow({ insight }: { insight: CrossMetricInsight }) {
  const Icon = insight.direction === "positive" ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center gap-3 py-2">
      <IconBadge icon={Icon} tone={insight.direction === "positive" ? "emerald" : "rose"} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {insight.metricA} <span className="text-muted-foreground">and</span> {insight.metricB}
        </p>
        <p className="text-xs text-muted-foreground">
          Based on {insight.sampleSize} days with both logged · correlation, not causation
        </p>
      </div>
      <Badge variant="secondary" className="shrink-0">
        {STRENGTH_LABEL[insight.strength]} {insight.direction}
      </Badge>
    </div>
  );
}

export function InsightsCard({ insights }: { insights: CrossMetricInsight[] }) {
  if (insights.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Sparkles className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No patterns yet</p>
            <p className="text-sm text-muted-foreground">
              Keep logging — patterns show up once there&apos;s enough overlapping data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="divide-y py-0">
        {insights.map((insight) => (
          <InsightRow key={`${insight.metricA}-${insight.metricB}`} insight={insight} />
        ))}
      </CardContent>
    </Card>
  );
}
