import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function JournalPage() {
  return (
    <ComingSoon
      icon={BookOpen}
      title="Journal"
      description="Morning and evening journal entries, searchable by date and mood."
    />
  );
}
