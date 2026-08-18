import { Home } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function TodayPage() {
  return (
    <ComingSoon
      icon={Home}
      title="Today"
      description="Log habits, water, sleep, fasting, meditation, journal, and photos in under a few minutes."
    />
  );
}
