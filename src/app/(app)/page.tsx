import { LayoutDashboard } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function DashboardPage() {
  return (
    <ComingSoon
      icon={LayoutDashboard}
      title="Dashboard"
      description="Your at-a-glance overview of habits, streaks, and recent trends."
    />
  );
}
