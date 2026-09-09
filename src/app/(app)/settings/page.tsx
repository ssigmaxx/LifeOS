import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getNotificationPreferences } from "@/lib/services/notification-service";
import { isCycleTrackingEnabled } from "@/lib/services/cycle-service";
import { getProfile } from "@/lib/services/profile-service";
import { isLockEnabled } from "@/lib/services/lock-service";
import { NotificationSettingsForm } from "./notification-settings-form";
import { CycleTrackingToggle } from "./cycle-tracking-toggle";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { LockSettingsForm } from "./lock-settings-form";
import { ReplayTourButton } from "./replay-tour-button";

export default async function SettingsPage() {
  const [preferences, cycleTrackingEnabled, profile, lockEnabled] = await Promise.all([
    getNotificationPreferences(),
    isCycleTrackingEnabled(),
    getProfile(),
    isLockEnabled(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, reminders, and notifications.</p>
      </div>
      <ProfileForm profile={profile} />
      <PasswordForm />
      <NotificationSettingsForm
        initialPreferences={preferences}
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
      />
      {/* Keyed on the value itself: CycleTrackingToggle seeds its own
          useState(initialEnabled) on mount, so a plain prop change (e.g.
          after ProfileForm's router.refresh() following a gender-driven
          auto-enable) wouldn't otherwise be picked up by an
          already-mounted instance — this forces a remount instead. */}
      <CycleTrackingToggle key={String(cycleTrackingEnabled)} initialEnabled={cycleTrackingEnabled} />
      <LockSettingsForm key={String(lockEnabled)} initialEnabled={lockEnabled} />

      <Card>
        <CardHeader>
          <CardTitle>Help</CardTitle>
          <CardDescription>Revisit the guided tour of LifeOS&apos;s features.</CardDescription>
        </CardHeader>
        <CardContent>
          <ReplayTourButton />
        </CardContent>
      </Card>
    </div>
  );
}
