"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FriendConnection } from "@/lib/services/friend-service";
import { removeFriendConnectionAction, respondToFriendRequestAction } from "./actions";

function RequestRow({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3 py-2">{children}</div>;
}

export function IncomingRequestList({ requests }: { requests: FriendConnection[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="divide-y">
      {requests.map((r) => (
        <RequestRow key={r.friendshipId}>
          <p className="min-w-0 flex-1 truncate text-sm">{r.friendEmail}</p>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={`Accept ${r.friendEmail}`}
            disabled={isPending}
            onClick={() => startTransition(() => respondToFriendRequestAction(r.friendshipId, true))}
          >
            <Check className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Decline ${r.friendEmail}`}
            disabled={isPending}
            onClick={() => startTransition(() => respondToFriendRequestAction(r.friendshipId, false))}
          >
            <X className="size-4" />
          </Button>
        </RequestRow>
      ))}
    </div>
  );
}

export function SentRequestList({ requests }: { requests: FriendConnection[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="divide-y">
      {requests.map((r) => (
        <RequestRow key={r.friendshipId}>
          <p className="min-w-0 flex-1 truncate text-sm">{r.friendEmail}</p>
          <Badge variant="secondary">Pending</Badge>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => startTransition(() => removeFriendConnectionAction(r.friendshipId))}
          >
            Cancel
          </Button>
        </RequestRow>
      ))}
    </div>
  );
}
