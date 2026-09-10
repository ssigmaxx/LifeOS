"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyLockPinAction } from "@/lib/lock-actions";

const INACTIVITY_MS = 7 * 60 * 1000; // 7 minutes
const ACTIVITY_CHECK_MS = 5000;
const LOCKED_KEY = "lifeos-app-locked";
const LAST_ACTIVE_KEY = "lifeos-app-last-active";

function subscribe(callback: () => void) {
  // Unlike other localStorage-backed stores in this app, this one DOES
  // change from outside this exact component instance — another tab on the
  // same device can lock or unlock it. The native "storage" event only
  // fires in *other* tabs, never the one that made the write, which is
  // exactly what's needed here: without it, locking in tab A would leave
  // tab B showing sensitive data until something unrelated happened to
  // re-render it.
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

// Pure, synchronous read of "should this device currently be considered
// locked" — a manual lock persists via localStorage, and an inactivity
// auto-lock is derived from elapsed time since the last recorded activity
// so it still applies even if the tab was closed and reopened after the
// 7 minutes passed (a plain setTimeout wouldn't fire while a tab is
// suspended). Never throws on storage access failures (private browsing).
function getLockSnapshot(): boolean {
  try {
    if (localStorage.getItem(LOCKED_KEY) === "1") return true;
    const raw = localStorage.getItem(LAST_ACTIVE_KEY);
    const lastActive = raw ? Number(raw) : Date.now();
    return Date.now() - lastActive > INACTIVITY_MS;
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

function writeLocked(locked: boolean) {
  try {
    localStorage.setItem(LOCKED_KEY, locked ? "1" : "0");
  } catch {
    // Storage unavailable (private browsing, etc.) — the lock still works
    // for this page load via React state, it just won't persist across one.
  }
}

function readLastActive(): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY);
    return raw ? Number(raw) : Date.now();
  } catch {
    return Date.now();
  }
}

function writeLastActive(ts: number) {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(ts));
  } catch {
    // Storage unavailable — inactivity tracking just won't persist across a reload.
  }
}

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

type LockContextValue = { lockEnabled: boolean; lockNow: () => void };
const LockContext = createContext<LockContextValue>({ lockEnabled: false, lockNow: () => {} });

// Used by LockButton (rendered in the sidebar/mobile nav) to trigger an
// immediate manual lock without threading a callback prop through every
// layer between AppShell and those nav components.
export function useAppLock() {
  return useContext(LockContext);
}

export function AppLockProvider({ lockEnabled, children }: { lockEnabled: boolean; children: ReactNode }) {
  // SSR-safe read of whatever was persisted (a manual lock, or enough
  // elapsed time since last activity to count as inactive) — same
  // getServerSnapshot reasoning as the onboarding flow's localStorage reads.
  const persistedLocked = useSyncExternalStore(subscribe, getLockSnapshot, getServerSnapshot);
  // Overrides persistedLocked for a change that happens within this render
  // session without anything re-invoking getLockSnapshot on its own: a
  // manual lock or the inactivity timer firing forces `true` immediately;
  // a correct PIN forces `false` immediately. null defers to persistedLocked.
  const [override, setOverride] = useState<boolean | null>(null);
  const locked = lockEnabled && (override ?? persistedLocked);

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!lockEnabled || locked) return;

    function markActive() {
      writeLastActive(Date.now());
    }
    markActive();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActive, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - readLastActive() > INACTIVITY_MS) {
        writeLocked(true);
        setOverride(true);
      }
    }, ACTIVITY_CHECK_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActive));
      clearInterval(interval);
    };
  }, [lockEnabled, locked]);

  function lockNow() {
    writeLocked(true);
    setOverride(true);
  }

  function submitPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4 || isPending) return;
    setError(null);
    setIsPending(true);
    verifyLockPinAction(pin)
      .then((result) => {
        if (!result.ok) {
          setError(result.error ?? "Incorrect PIN.");
          setPin("");
          return;
        }
        writeLocked(false);
        writeLastActive(Date.now());
        setOverride(false);
        setPin("");
      })
      .finally(() => setIsPending(false));
  }

  return (
    <LockContext.Provider value={{ lockEnabled, lockNow }}>
      {children}
      {locked ? (
        // z-[100], not z-50: dialogs (including this app's) portal to the
        // end of <body> and use z-50, so at equal z-index a dialog open at
        // the moment of locking would paint on top of this screen — this
        // needs to always win.
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background p-6">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-6" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold">Meridian is locked</h1>
            <p className="text-sm text-muted-foreground">Enter your 4-digit PIN to continue.</p>
          </div>
          <form onSubmit={submitPin} className="flex flex-col items-center gap-3">
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-32 text-center text-2xl tracking-[0.5em]"
              aria-label="4-digit PIN"
            />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pin.length !== 4 || isPending}>
              Unlock
            </Button>
          </form>
        </div>
      ) : null}
    </LockContext.Provider>
  );
}

export function LockButton() {
  const { lockEnabled, lockNow } = useAppLock();
  if (!lockEnabled) return null;
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Lock screen now" onClick={lockNow}>
      <Lock className="size-4" />
    </Button>
  );
}
