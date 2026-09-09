import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Export your data</p>
            <p className="text-sm text-muted-foreground">
              Download a JSON file of your habits, logs, goals, todos, journal entries, saved foods, and budget
              categories.
            </p>
          </div>
          <Button size="sm" variant="outline" nativeButton={false} render={<a href="/api/export" download />}>
            <Download className="size-4" /> Export data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
