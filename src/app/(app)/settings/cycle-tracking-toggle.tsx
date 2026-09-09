"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setCycleTrackingEnabledAction } from "../cycle/actions";

export function CycleTrackingToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setEnabled(next); // optimistic — rolled back below if the save fails
    startTransition(async () => {
      try {
        await setCycleTrackingEnabledAction(next);
        toast.success(next ? "Cycle tracking is on — check the nav for it." : "Cycle tracking is off.");
      } catch (err) {
        setEnabled(!next);
        toast.error(err instanceof Error ? err.message : "Failed to update.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="cycle-tracking">Cycle tracking</Label>
          <p className="text-sm text-muted-foreground">
            Period, birth control, mood, and pain tracking. Off by default — turning it on adds a Cycle item to the
            nav; nobody else can see this unless you tell them.
          </p>
        </div>
        <Switch id="cycle-tracking" checked={enabled} disabled={isPending} onCheckedChange={toggle} />
      </CardContent>
    </Card>
  );
}
