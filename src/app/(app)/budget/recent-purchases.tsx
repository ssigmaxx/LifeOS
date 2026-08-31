import { Globe, Recycle, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { PURCHASE_MODE_LABELS } from "@/lib/carbon/categories";
import type { RecentPurchase } from "@/lib/services/budget-service";

export function RecentPurchases({ purchases }: { purchases: RecentPurchase[] }) {
  if (purchases.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Recent purchases</h2>
      <Card>
        <CardContent className="divide-y py-0">
          {purchases.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium">{p.note || p.categoryLabel}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{p.categoryLabel}</Badge>
                  {p.purchaseMode ? (
                    <Badge variant="outline">
                      {p.purchaseMode === "online" ? <Globe /> : <Store />}
                      {PURCHASE_MODE_LABELS[p.purchaseMode]}
                    </Badge>
                  ) : null}
                  {p.condition === "secondhand" ? (
                    <Badge variant="secondary">
                      <Recycle /> Secondhand
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 space-y-0.5 text-right">
                <p className="text-sm tabular-nums">{formatCurrency(p.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.co2eKg != null ? `${p.co2eKg.toFixed(1)} kg CO₂e` : "—"}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
