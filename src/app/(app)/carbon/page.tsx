import { Leaf, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { getCarbonSummary, getRecentActivity, isCarbonApiConfigured } from "@/lib/services/carbon-service";
import { FootprintSummary } from "./footprint-summary";
import { CarbonTrendChart } from "./carbon-trend-chart";
import { CarbonLogDialog } from "./carbon-log-dialog";
import { RecentActivityList } from "./recent-activity-list";

const RANGE_DAYS = 30;

export default async function CarbonPage() {
  const [summary, recentActivity] = await Promise.all([
    getCarbonSummary(RANGE_DAYS),
    getRecentActivity(15),
  ]);
  const apiConfigured = isCarbonApiConfigured();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Carbon footprint</h1>
          <p className="text-sm text-muted-foreground">
            Estimated CO₂e from your food, travel, energy, and shopping. Food is pulled from your food
            log automatically — nothing to log here.
          </p>
        </div>
        <CarbonLogDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> Log activity
            </Button>
          }
        />
      </div>

      {!apiConfigured ? (
        <p className="text-xs text-warning">
          Add CLIMATIQ_API_KEY to your environment to calculate travel, energy, and shopping emissions.
          Food estimates work without it.
        </p>
      ) : null}

      <FootprintSummary summary={summary} rangeDays={RANGE_DAYS} />

      <Card>
        <CardContent>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Daily footprint by category</p>
          <CarbonTrendChart series={summary.dailySeries} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Recent activity</h2>
        {recentActivity.length === 0 ? (
          <EmptyState
            icon={Leaf}
            title="Nothing logged yet"
            description="Log a trip, some energy usage, or a purchase to see it here."
          />
        ) : (
          <Card>
            <CardContent className="py-0">
              <RecentActivityList items={recentActivity} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
