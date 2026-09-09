"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnPasswordAction } from "./actions";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await updateOwnPasswordAction({ password, confirmPassword });
      if (result.error) {
        setError(result.error);
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setNotice("Password updated.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change the password you use to log in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="settings-password">New password</Label>
          <Input
            id="settings-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-confirmPassword">Confirm new password</Label>
          <Input
            id="settings-confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
        <Button onClick={save} disabled={isPending || !password}>
          Update password
        </Button>
      </CardContent>
    </Card>
  );
}
