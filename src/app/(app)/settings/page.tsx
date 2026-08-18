import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Settings"
      description="Profile, units, timezone, theme, notifications, AI preferences, and data export."
    />
  );
}
