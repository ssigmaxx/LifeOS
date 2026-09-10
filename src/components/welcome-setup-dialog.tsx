"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Gender } from "@/lib/services/profile-service";
import { updateProfileAction } from "@/app/(app)/settings/actions";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

// First-run only — gated by the caller on profile.displayName being empty,
// so this never reappears once someone has actually set a name (whether
// through here or later in Settings). Built on AlertDialog rather than
// Dialog specifically because it can't be skipped: AlertDialog doesn't
// close on Escape or a backdrop click the way Dialog does, and there's no
// close button here — the only way out is filling this in and continuing.
export function WelcomeSetupDialog({ open, onSaved }: { open: boolean; onSaved: () => void }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canContinue = displayName.trim() !== "" && birthDate !== "" && gender !== "";

  function save() {
    if (!canContinue) return;
    setError(null);
    startTransition(async () => {
      const result = await updateProfileAction({ displayName, avatarIcon: "", birthDate, gender });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onSaved();
    });
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Welcome to Meridian</AlertDialogTitle>
          <AlertDialogDescription>A couple of quick questions to get things set up for you.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="welcomeName">What should we call you?</Label>
            <Input
              id="welcomeName"
              value={displayName}
              maxLength={60}
              placeholder="Your name"
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeBirthDate">Date of birth</Label>
            <Input
              id="welcomeBirthDate"
              type="date"
              value={birthDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={gender === option.value}
                  onClick={() => setGender(option.value)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    gender === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {gender === "female" ? (
              <p className="text-sm text-muted-foreground">
                We&apos;ll turn on cycle tracking for you — you can switch it back off anytime in Settings.
              </p>
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <AlertDialogFooter>
          <Button onClick={save} disabled={isPending || !canContinue} className="w-full">
            {isPending ? "Saving…" : "Continue"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
