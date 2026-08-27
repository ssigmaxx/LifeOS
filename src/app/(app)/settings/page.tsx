import { getNotificationPreferences } from "@/lib/services/notification-service";
import { NotificationSettingsForm } from "./notification-settings-form";

export default async function SettingsPage() {
  const preferences = await getNotificationPreferences();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage reminders and notifications.</p>
      </div>
      <NotificationSettingsForm
        initialPreferences={preferences}
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
      />
    </div>
  );
}
