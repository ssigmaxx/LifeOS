import { Calendar } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function CalendarPage() {
  return (
    <ComingSoon
      icon={Calendar}
      title="Calendar"
      description="A monthly view of your daily scores — click any day for details."
    />
  );
}
