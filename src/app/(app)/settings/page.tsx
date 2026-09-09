import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getNotificationPreferences } from "@/lib/services/notification-service";
import { isCycleTrackingEnabled } from "@/lib/services/cycle-service";
import { getProfile } from "@/lib/services/profile-service";
import { NotificationSettingsForm } from "./notification-settings-form";
import { CycleTrackingToggle } from "./cycle-tracking-toggle";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { ReplayTourButton } from "./replay-tour-button";

export default async function SettingsPage() {
  const [preferences, cycleTrackingEnabled, profile] = await Promise.all([
    getNotificationPreferences(),
    isCycleTrackingEnabled(),
    getProfile(),
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
      <CycleTrackingToggle initialEnabled={cycleTrackingEnabled} />

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
