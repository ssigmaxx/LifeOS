"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/services/profile-service";
import { updateProfileAction } from "./actions";

const AVATAR_ICONS = [
  "😀", "😎", "🥳", "🤓", "🦁", "🐯", "🐼", "🦊",
  "🐨", "🐸", "🦄", "🐙", "🌟", "🔥", "🌈", "🍀",
  "⚡", "🌙", "☀️", "🌊", "🌵", "🎯", "🚀", "🎨",
];

function calculateAge(birthDate: string): number | null {
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > parsed.getMonth() ||
    (now.getMonth() === parsed.getMonth() && now.getDate() >= parsed.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age >= 0 ? age : null;
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [avatarIcon, setAvatarIcon] = useState(profile.avatarIcon ?? "");
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const age = birthDate ? calculateAge(birthDate) : null;

  function save() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await updateProfileAction({ displayName, avatarIcon, birthDate });
      if (result.error) setError(result.error);
      else setNotice("Profile saved.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name, icon, and details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={profile.email} disabled readOnly />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Name</Label>
          <Input
            id="displayName"
            value={displayName}
            maxLength={60}
            placeholder="What should we call you?"
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Icon</Label>
          <div className="flex flex-wrap gap-1.5">
            {AVATAR_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                aria-label={`Use ${icon} as your icon`}
                aria-pressed={avatarIcon === icon}
                onClick={() => setAvatarIcon(avatarIcon === icon ? "" : icon)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border text-lg transition-colors",
                  avatarIcon === icon
                    ? "border-primary bg-primary/10"
                    : "border-input hover:bg-accent",
                )}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthDate">Date of birth</Label>
          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          {age !== null ? <p className="text-sm text-muted-foreground">Age: {age}</p> : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

        <Button onClick={save} disabled={isPending}>
          Save profile
        </Button>
      </CardContent>
    </Card>
  );
}
