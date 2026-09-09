"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TOUR_DISMISS_KEY } from "@/components/onboarding-tour";

export function ReplayTourButton() {
  const router = useRouter();

  function replay() {
    try {
      localStorage.removeItem(TOUR_DISMISS_KEY);
    } catch {
      // Storage unavailable — nothing to clear, the tour just won't replay.
    }
    router.push("/");
  }

  return (
    <Button variant="outline" size="sm" onClick={replay}>
      Replay the welcome tour
    </Button>
  );
}
