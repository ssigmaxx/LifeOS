import { Target } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function GoalsPage() {
  return (
    <ComingSoon
      icon={Target}
      title="Goals"
      description="Set realistic targets and track progress toward them over time."
    />
  );
}
