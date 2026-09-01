import Link from "next/link";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconBadge } from "@/components/icon-badge";

function formatKg(kg: number): string {
  return kg < 10 ? `${kg.toFixed(1)} kg` : `${Math.round(kg)} kg`;
}

export function FootprintCard({ totalCo2eKg }: { totalCo2eKg: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <IconBadge icon={Leaf} tone="emerald" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Carbon footprint</p>
          <p className="text-xs text-muted-foreground">{formatKg(totalCo2eKg)} CO₂e today</p>
        </div>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/carbon" />}>
          View
        </Button>
      </CardContent>
    </Card>
  );
}
