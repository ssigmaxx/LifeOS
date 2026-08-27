import { Apple, Car, ShoppingBag, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CarbonCategory, CarbonSummary } from "@/lib/carbon-summary";

const CATEGORY_META: Record<CarbonCategory, { label: string; icon: typeof Apple }> = {
  food: { label: "Food", icon: Apple },
  travel: { label: "Travel", icon: Car },
  energy: { label: "Energy", icon: Zap },
  shopping: { label: "Shopping", icon: ShoppingBag },
};

function formatKg(kg: number): string {
  if (kg < 10) return `${kg.toFixed(1)} kg`;
  return `${Math.round(kg)} kg`;
}

export function FootprintSummary({ summary, rangeDays }: { summary: CarbonSummary; rangeDays: number }) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Last {rangeDays} days</p>
          <p className="text-3xl font-semibold tracking-tight">{formatKg(summary.totalCo2eKg)} CO₂e</p>
          {summary.awaitingCalculationCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              {summary.awaitingCalculationCount} {summary.awaitingCalculationCount === 1 ? "entry is" : "entries are"}{" "}
              still waiting on a calculation.
            </p>
          ) : null}
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(CATEGORY_META) as CarbonCategory[]).map((category) => {
            const { label, icon: Icon } = CATEGORY_META[category];
            return (
              <div key={category} className="space-y-1">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="size-3.5" /> {label}
                </dt>
                <dd className="text-sm font-medium tabular-nums">{formatKg(summary.byCategory[category])}</dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
