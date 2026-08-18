import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function AnalyticsPage() {
  return (
    <ComingSoon
      icon={BarChart3}
      title="Analytics"
      description="Trends, streaks, habit comparisons, and your daily score over time."
    />
  );
}
