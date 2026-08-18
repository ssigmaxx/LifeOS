import { ListChecks } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function HabitsPage() {
  return (
    <ComingSoon
      icon={ListChecks}
      title="Habits"
      description="Create, schedule, and manage the habits you're tracking."
    />
  );
}
