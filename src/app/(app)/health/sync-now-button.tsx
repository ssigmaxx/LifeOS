"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { syncFitbitNowAction } from "./actions";

export function SyncNowButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      const result = await syncFitbitNowAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Synced.");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={sync} disabled={isPending}>
      <RefreshCw className="size-4" /> {isPending ? "Syncing…" : "Sync now"}
    </Button>
  );
}
