"use client";

import { useState } from "react";
import { Droplets, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { formatMl } from "@/lib/format";
import type { TodayWater } from "@/lib/services/water-service";
import { addWaterLogAction, deleteWaterLogAction } from "./actions";

const PRESETS_ML = [250, 500, 750, 1000];

export function WaterCard({ water }: { water: TodayWater }) {
  const [pending, setPending] = useState(false);
  const [customMl, setCustomMl] = useState("");
  const pct = Math.min(Math.round((water.totalMl / water.targetMl) * 100), 100);
  const lastLog = water.logs[0];

  async function log(amountMl: number) {
    setPending(true);
    await addWaterLogAction(amountMl);
    setPending(false);
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Droplets className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Water</p>
            <p className="text-xs text-muted-foreground">
              {formatMl(water.totalMl)} / {formatMl(water.targetMl)}
            </p>
          </div>
          {lastLog ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Undo last log"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                await deleteWaterLogAction(lastLog.id);
                setPending(false);
              }}
            >
              <Undo2 className="size-4" />
            </Button>
          ) : null}
        </div>
        <Progress value={pct} />
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS_ML.map((ml) => (
            <Button
              key={ml}
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => log(ml)}
            >
              +{formatMl(ml)}
            </Button>
          ))}
          <Input
            type="number"
            min={1}
            value={customMl}
            onChange={(e) => setCustomMl(e.target.value)}
            placeholder="ml"
            className="h-8 w-20"
          />
          <Button
            type="button"
            size="sm"
            disabled={pending || !customMl}
            onClick={() => {
              const ml = Number(customMl);
              setCustomMl("");
              log(ml);
            }}
          >
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
