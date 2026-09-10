"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
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

// Tour: shown once ever, permanently dismissed via localStorage. Replayable
// from Settings (see replay-tour-button.tsx, which clears this key).
export const TOUR_DISMISS_KEY = "lifeos-onboarding-tour-dismissed";
// Checklist: dismissed only for the current session (sessionStorage, not
// localStorage) — skipping it should stop nagging for this login, but it
// comes back next time you sign in, right up until a habit actually exists.
const CHECKLIST_SESSION_KEY = "lifeos-onboarding-checklist-dismissed";

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

export type OnboardingStep = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

export function OnboardingFlow({ steps }: { steps: OnboardingStep[] }) {
  // Deliberately NOT useSyncExternalStore here: that relies on React
  // noticing a mismatch between getServerSnapshot's value and the real
  // client read, then scheduling a corrective re-render on its own after
  // hydration — on a page this size (many other client components/hooks
  // mounting alongside it) that automatic resync was landing unreliably,
  // leaving the tour stuck showing "not dismissed" even when localStorage
  // already had it marked dismissed. Reading the real values explicitly in
  // an effect after mount is a plainer, more predictable pattern: nothing
  // is shown until the effect has actually run and set real state, so
  // there's nothing to resync — same SSR-safety, no reliance on automatic
  // reconciliation.
  const [mounted, setMounted] = useState(false);
  const [tourPersistedDismissed, setTourPersistedDismissed] = useState(false);
  const [checklistPersistedDismissed, setChecklistPersistedDismissed] = useState(false);
  const [tourClosedNow, setTourClosedNow] = useState(false);
  const [checklistClosedNow, setChecklistClosedNow] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    // The lint rule this disables is aimed at effects that could instead be
    // plain derived state; it doesn't apply to the standard "read a
    // browser-only API once after mount, to stay SSR-safe" pattern this is
    // — see the comment above the state declarations.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTourPersistedDismissed(localStorage.getItem(TOUR_DISMISS_KEY) === "1");
    } catch {
      // Storage unavailable (private browsing, etc.) — treat as not dismissed.
    }
    try {
      setChecklistPersistedDismissed(sessionStorage.getItem(CHECKLIST_SESSION_KEY) === "1");
    } catch {
      // Storage unavailable — treat as not dismissed.
    }
    setMounted(true);
  }, []);

  const tourDismissed = tourPersistedDismissed || tourClosedNow;
  const checklistDismissedThisSession = checklistPersistedDismissed || checklistClosedNow;
  // The checklist's whole job is getting a first habit created — once
  // that's done, stop showing it for good, regardless of the other steps or
  // whether it was ever explicitly skipped.
  const habitCreated = steps.find((s) => s.id === "habit")?.done ?? false;

  function persistTourDismissed() {
    setTourClosedNow(true);
    try {
      localStorage.setItem(TOUR_DISMISS_KEY, "1");
    } catch {
      // Storage unavailable (private browsing, etc.) — dismissal just won't persist.
    }
  }

  // Skipping or closing early reads as "stop showing me onboarding stuff" —
  // if the checklist popped up immediately in the tour's place, closing the
  // tour would look like it did nothing (a different box just replaced it
  // in the same spot). So skip suppresses the checklist for this session
  // too; it still comes back on the next login if a habit still doesn't
  // exist by then, same as if it had been skipped on its own.
  function skipTour() {
    persistTourDismissed();
    dismissChecklist();
  }

  // Reaching the end normally (not skipping) is the one case where
  // chaining straight into the checklist is the intended, expected flow.
  function finishTour() {
    persistTourDismissed();
  }

  function dismissChecklist() {
    setChecklistClosedNow(true);
    try {
      sessionStorage.setItem(CHECKLIST_SESSION_KEY, "1");
    } catch {
      // Storage unavailable — dismissal just won't persist for this session.
    }
  }

  // Gated on `mounted` so nothing ever shows before the effect above has
  // actually read the real localStorage/sessionStorage values — the server
  // render and the very first client paint both show neither dialog,
  // identically, so there's no SSR/client mismatch to reconcile at all.
  // showChecklist also requires !showTour so the two dialogs can never both
  // be open at once. `open` is passed as the live showTour/showChecklist
  // value (not a hardcoded `true` with the Dialog conditionally mounted
  // instead) — base-ui's close machinery (X button, Escape, backdrop
  // click) needs a genuinely reactive open prop to fire onOpenChange
  // correctly; a Dialog that's always rendered with a fixed `open` value
  // doesn't reliably wire that up.
  const showTour = mounted && !tourDismissed;
  const showChecklist = mounted && !showTour && !habitCreated && !checklistDismissedThisSession;

  const slide = SLIDES[tourStep];
  const isLastSlide = tourStep === SLIDES.length - 1;
  const SlideIcon = slide.icon;

  return (
    <>
      <Dialog open={showTour} onOpenChange={(next) => (!next ? skipTour() : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SlideIcon className="size-5" />
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
                  i === tourStep ? "w-4 bg-primary" : "w-1.5 bg-muted",
                )}
              />
            ))}
          </div>

          <DialogFooter className="flex-row items-center justify-between sm:justify-between">
            <Button variant="ghost" size="sm" onClick={skipTour}>
              Skip tour
            </Button>
            <div className="flex items-center gap-2">
              {tourStep > 0 ? (
                <Button variant="outline" size="sm" onClick={() => setTourStep((s) => s - 1)}>
                  <ArrowLeft className="size-4" /> Back
                </Button>
              ) : null}
              {isLastSlide ? (
                <Button size="sm" onClick={finishTour}>
                  Get started
                </Button>
              ) : (
                <Button size="sm" onClick={() => setTourStep((s) => s + 1)}>
                  Next <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChecklist} onOpenChange={(next) => (!next ? dismissChecklist() : undefined)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Get set up</DialogTitle>
            <DialogDescription>A few quick steps to get started.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            {steps.map((step) => (
              <Link
                key={step.id}
                href={step.href}
                onClick={dismissChecklist}
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
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={dismissChecklist}>
              Skip for now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
