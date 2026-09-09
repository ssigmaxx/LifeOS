import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function NavUser({
  email,
  displayName,
  avatarIcon,
}: {
  email: string;
  displayName?: string | null;
  avatarIcon?: string | null;
}) {
  const initial = email.charAt(0).toUpperCase();
  const primaryLabel = displayName || email;

  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="text-xs">{avatarIcon || initial}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {primaryLabel}
      </span>
      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Log out"
          className="shrink-0"
        >
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}
