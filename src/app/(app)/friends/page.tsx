import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { getFriendsSharedHabits, listFriendConnections } from "@/lib/services/friend-service";
import { AddFriendForm } from "./add-friend-form";
import { IncomingRequestList, SentRequestList } from "./friend-request-list";
import { FriendGroup } from "./friend-group";

export default async function FriendsPage() {
  const [connections, sharedHabits] = await Promise.all([
    listFriendConnections(),
    getFriendsSharedHabits(),
  ]);

  const incoming = connections.filter((c) => c.status === "pending" && !c.isRequester);
  const sent = connections.filter((c) => c.status === "pending" && c.isRequester);
  const accepted = connections.filter((c) => c.status === "accepted");
  const friendshipIdByFriendId = new Map(accepted.map((c) => [c.friendId, c.friendshipId]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Friends</h1>
        <p className="text-sm text-muted-foreground">
          Connect with friends and see the habits they choose to share.
        </p>
      </div>

      <Card>
        <CardContent>
          <AddFriendForm />
        </CardContent>
      </Card>

      {incoming.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Requests</h2>
          <Card>
            <CardContent className="divide-y py-0">
              <IncomingRequestList requests={incoming} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {sent.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Sent</h2>
          <Card>
            <CardContent className="divide-y py-0">
              <SentRequestList requests={sent} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Friends</h2>
        {sharedHabits.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No friends yet"
            description="Send a request above to start sharing habits and staying motivated together."
          />
        ) : (
          <div className="space-y-6">
            {sharedHabits.map((friend) => (
              <FriendGroup
                key={friend.friendId}
                friend={friend}
                friendshipId={friendshipIdByFriendId.get(friend.friendId)!}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
