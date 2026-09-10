import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string }>;
}) {
  const { error, deleted } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Welcome back to your private Meridian.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {deleted ? (
          <p role="status" className="text-sm text-muted-foreground">
            Your account and all its data have been permanently deleted.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <LoginForm />
        <div className="flex justify-between text-sm text-muted-foreground">
          <Link href="/signup" className="hover:text-foreground">
            Create an account
          </Link>
          <Link href="/forgot-password" className="hover:text-foreground">
            Forgot password?
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
