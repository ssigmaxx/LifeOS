import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card className="border-dashed">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            <Icon className="size-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-base font-medium">
            This screen isn&apos;t built yet
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          {title} is coming in a later phase. The navigation shell is wired up
          so you can already click around the whole app.
        </CardContent>
      </Card>
    </div>
  );
}
