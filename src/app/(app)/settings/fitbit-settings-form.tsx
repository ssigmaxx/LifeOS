"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { disconnectFitbitAction } from "./actions";

const STATUS_MESSAGES: Record<string, { message: string; variant: "success" | "error" }> = {
  connected: { message: "Fitbit connected.", variant: "success" },
  error: { message: "Couldn't connect Fitbit. Please try again.", variant: "error" },
  not_configured: { message: "Fitbit isn't configured yet on this deployment.", variant: "error" },
};

export function FitbitSettingsForm({ connected, status }: { connected: boolean; status?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!status) return;
    const entry = STATUS_MESSAGES[status];
    if (!entry) return;
    if (entry.variant === "success") {
      toast.success(entry.message);
    } else {
      toast.error(entry.message);
    }
    // Strip the ?fitbit=... param so a refresh doesn't re-fire the toast.
    router.replace("/settings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectFitbitAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Fitbit disconnected.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fitbit</CardTitle>
        <CardDescription>
          {connected
            ? "Your Fitbit/Pixel Watch account is connected via the Google Health API."
            : "Connect a Fitbit or Pixel Watch account to bring in steps, heart rate, and sleep data."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connected ? (
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Activity className="size-4" />
            </div>
            <p className="flex-1 text-sm text-muted-foreground">Connected.</p>
            <Button variant="outline" size="sm" onClick={disconnect} disabled={isPending}>
              Disconnect
            </Button>
          </div>
        ) : (
          <Button render={<a href="/api/fitbit/connect" />}>
            <Activity className="size-4" /> Connect Fitbit
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
