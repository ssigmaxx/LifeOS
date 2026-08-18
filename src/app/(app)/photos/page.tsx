import { Images } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function PhotosPage() {
  return (
    <ComingSoon
      icon={Images}
      title="Photos"
      description="Private, timestamped face and body progress photos with comparison tools."
    />
  );
}
