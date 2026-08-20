"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <TriangleAlert className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground">This page hit an error loading its data.</p>
        </div>
        <Button size="sm" onClick={() => reset()}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
