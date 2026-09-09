"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removeLockPinAction, setLockPinAction } from "@/lib/lock-actions";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function LockSettingsForm({ initialEnabled }: { initialEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    setNotice(null);
    if (pin.length !== 4) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match.");
      return;
    }
    startTransition(async () => {
      const result = await setLockPinAction(pin);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEnabled(true);
      setPin("");
      setConfirmPin("");
      setNotice("Screen lock is on. You'll need this PIN to unlock LifeOS.");
      // The lock gate wrapping the whole app reads this from the layout —
      // refresh so it picks up the change without needing a full reload.
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await removeLockPinAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEnabled(false);
      setNotice("Screen lock turned off.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screen lock</CardTitle>
        <CardDescription>
          {enabled
            ? "A 4-digit PIN protects LifeOS on this device — it locks automatically after 7 minutes of inactivity, or you can lock it instantly from the sidebar."
            : "Set a 4-digit PIN to lock LifeOS instead of logging out when you step away. Locks automatically after 7 minutes of inactivity."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled ? (
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="size-4" />
            </div>
            <p className="flex-1 text-sm text-muted-foreground">Screen lock is on.</p>
            <Button variant="outline" size="sm" onClick={remove} disabled={isPending}>
              <LockOpen className="size-4" /> Turn off
            </Button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lock-pin">{enabled ? "New PIN" : "PIN"}</Label>
            <Input
              id="lock-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(digitsOnly(e.target.value))}
              placeholder="••••"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lock-pin-confirm">Confirm PIN</Label>
            <Input
              id="lock-pin-confirm"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(digitsOnly(e.target.value))}
              placeholder="••••"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

        <Button onClick={save} disabled={isPending}>
          {enabled ? "Change PIN" : "Set PIN"}
        </Button>
      </CardContent>
    </Card>
  );
}
