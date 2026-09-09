"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "lifeos-onboarding-dismissed";

function subscribe() {
  // Nothing outside this component changes the dismissal flag, so there's
  // no external event to listen for — this store only ever needs reading.
  return () => {};
}

function getSnapshot() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

export type OnboardingStep = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  // useSyncExternalStore (rather than reading localStorage in an effect)
  // renders `false` for the server/first-paint snapshot so hydration
  // matches, then resyncs to the real client value right after — the
  // standard pattern for localStorage-backed UI that has to agree with SSR.
  const dismissedInStorage = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const allDone = steps.every((s) => s.done);

  if (allDone || dismissedInStorage || dismissedLocally) return null;

  function dismiss() {
    setDismissedLocally(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Storage unavailable (private browsing, etc.) — dismissal just won't persist.
    }
  }

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Get started</p>
            <p className="text-xs text-muted-foreground">A few quick steps to set LifeOS up.</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss get-started checklist"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-1">
          {steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm transition-colors hover:bg-accent"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  step.done ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
              >
                {step.done ? <Check className="size-3" /> : null}
              </span>
              <span className={cn(step.done && "text-muted-foreground line-through")}>{step.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
