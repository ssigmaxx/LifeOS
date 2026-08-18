import { Sparkles } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function AiCoachPage() {
  return (
    <ComingSoon
      icon={Sparkles}
      title="AI Coach"
      description="Ask Gemini about your real tracked data — no invented statistics, ever."
    />
  );
}
