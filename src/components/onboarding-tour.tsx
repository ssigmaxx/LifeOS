"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  HeartPulse,
  Home,
  ListChecks,
  Settings,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const TOUR_DISMISS_KEY = "lifeos-onboarding-tour-dismissed";

function subscribe() {
  // Nothing outside this component changes the dismissal flag, so there's
  // no external event to listen for — this store only ever needs reading.
  return () => {};
}

function getSnapshot() {
  try {
    return localStorage.getItem(TOUR_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

type Slide = { title: string; description: string; href: string; icon: LucideIcon };

// One slide per nav grouping rather than per page (16 pages would make a
// tedious tour) — each slide links to the first page in the group it
// describes, so "explore it now" is one click away.
const SLIDES: Slide[] = [
  {
    title: "Welcome to LifeOS",
    description:
      "A quick tour of what's here — nine short stops, then you're set. You can reopen this anytime from Settings.",
    href: "/",
    icon: Sparkles,
  },
  {
    title: "Dashboard & Today",
    description:
      "Dashboard is your at-a-glance overview. Today is where you actually log things — habits, todos, everything due today in one place.",
    href: "/today",
    icon: Home,
  },
  {
    title: "Habits & Todos",
    description:
      "Habits are recurring things you build a streak on (daily or specific days). Todos are one-off tasks with due dates — kept separate so streaks stay meaningful.",
    href: "/habits",
    icon: ListChecks,
  },
  {
    title: "Nutrition, Budget, Carbon & Goals",
    description:
      "Log meals and water, track spending against budgets, estimate your carbon footprint, and set goals with milestones to work toward over time.",
    href: "/goals",
    icon: Target,
  },
  {
    title: "Cycle tracking — optional",
    description:
      "An opt-in period, birth control, mood, and pain tracker with next-period and fertile-window predictions from your own history. Off by default — turn it on anytime in Settings.",
    href: "/settings",
    icon: HeartPulse,
  },
  {
    title: "Journal, Photos & AI Coach",
    description:
      "Journal is a private place to reflect. Photos keeps a visual progress log. AI Coach looks at your data and offers feedback.",
    href: "/journal",
    icon: BookOpen,
  },
  {
    title: "Analytics & Calendar",
    description:
      "Analytics charts your trends over time and lets you export your data. Calendar shows habits, todos, goals, and events together in one view.",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Your profile & Settings",
    description:
      "Set your name and pick an icon, manage reminders and notifications, and change your password — all from Settings.",
    href: "/settings",
    icon: Settings,
  },
  {
    title: "One more thing",
    description: "Press ⌘K (or Ctrl+K) anywhere to jump straight to any page without touching the nav.",
    href: "/",
    icon: Sparkles,
  },
];

export function OnboardingTour() {
  // Same SSR-safe localStorage pattern as OnboardingChecklist: render the
  // server snapshot (not dismissed) first so hydration matches, then resync.
  const dismissedInStorage = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const [step, setStep] = useState(0);

  const open = !dismissedInStorage && !dismissedLocally;

  function dismiss() {
    setDismissedLocally(true);
    try {
      localStorage.setItem(TOUR_DISMISS_KEY, "1");
    } catch {
      // Storage unavailable (private browsing, etc.) — dismissal just won't persist.
    }
  }

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;
  const Icon = slide.icon;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? dismiss() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <DialogTitle>{slide.title}</DialogTitle>
          <DialogDescription>{slide.description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1.5 py-1">
          {SLIDES.map((s, i) => (
            <span
              key={s.title}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-4 bg-primary" : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
            ) : null}
            {isLast ? (
              <Button size="sm" onClick={dismiss} render={<Link href="/" />}>
                Get started
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Next <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
