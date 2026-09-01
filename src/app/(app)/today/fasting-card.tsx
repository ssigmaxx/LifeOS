"use client";

import { useEffect, useState } from "react";
import { Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { IconBadge } from "@/components/icon-badge";
import { formatMinutes } from "@/lib/format";
import type { FastingSession } from "@/lib/services/fasting-service";
import { cancelFastAction, endFastAction, startFastAction } from "./actions";

const PRESET_HOURS = [12, 14, 16, 18, 20];

function useElapsedMinutes(startTime: string | null) {
  const [minutes, setMinutes] = useState(() =>
    startTime ? Math.floor((Date.now() - new Date(startTime).getTime()) / 60000) : 0,
  );

  useEffect(() => {
    if (!startTime) return;
    const tick = () =>
      setMinutes(Math.floor((Date.now() - new Date(startTime).getTime()) / 60000));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [startTime]);

  return minutes;
}

export function FastingCard({
  current,
  lastCompleted,
}: {
  current: FastingSession | null;
  lastCompleted: FastingSession | null;
}) {
  const [pending, setPending] = useState(false);
  const elapsedMinutes = useElapsedMinutes(current?.startTime ?? null);
  const targetMinutes = current?.targetHours ? current.targetHours * 60 : null;
  const pct = targetMinutes ? Math.min(Math.round((elapsedMinutes / targetMinutes) * 100), 100) : 0;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <IconBadge icon={Timer} tone="orange" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Fasting</p>
            <p className="text-xs text-muted-foreground">
              {current
                ? `${formatMinutes(elapsedMinutes)} elapsed${targetMinutes ? ` of ${current.targetHours}h target` : ""}`
                : lastCompleted
                  ? `Last fast: ${formatMinutes(lastCompleted.durationMinutes ?? 0)}`
                  : "Not started"}
            </p>
          </div>
          {current ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Cancel fast"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                await cancelFastAction(current.id);
                setPending(false);
              }}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>

        {current ? (
          <>
            {targetMinutes ? <Progress value={pct} /> : null}
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                await endFastAction(current.id);
                setPending(false);
              }}
            >
              End fast
            </Button>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_HOURS.map((h) => (
              <Button
                key={h}
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  await startFastAction(h);
                  setPending(false);
                }}
              >
                {h}h
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                await startFastAction(null);
                setPending(false);
              }}
            >
              Start (no target)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
