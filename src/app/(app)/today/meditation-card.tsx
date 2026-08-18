"use client";

import { useState } from "react";
import { Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMinutes } from "@/lib/format";
import type { TodayMeditation } from "@/lib/services/meditation-service";
import { logMeditationAction } from "./actions";

const PRESETS_MIN = [5, 10, 20, 30, 45, 60];

export function MeditationCard({ meditation }: { meditation: TodayMeditation }) {
  const [pending, setPending] = useState(false);
  const [customMin, setCustomMin] = useState("");

  async function log(minutes: number) {
    setPending(true);
    await logMeditationAction(minutes);
    setPending(false);
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Wind className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Meditation</p>
            <p className="text-xs text-muted-foreground">
              {meditation.totalMinutes > 0
                ? `${formatMinutes(meditation.totalMinutes)} today (${meditation.sessionCount} session${meditation.sessionCount === 1 ? "" : "s"})`
                : "Not logged yet"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS_MIN.map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => log(m)}
            >
              {m}m
            </Button>
          ))}
          <Input
            type="number"
            min={1}
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            placeholder="min"
            className="h-8 w-16"
          />
          <Button
            type="button"
            size="sm"
            disabled={pending || !customMin}
            onClick={() => {
              const m = Number(customMin);
              setCustomMin("");
              log(m);
            }}
          >
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
