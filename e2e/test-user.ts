// Shared helpers for creating/deleting disposable Supabase Auth users for
// E2E runs, via the Admin API — the same pattern used for manual QA
// throughout this project (see .claude memory / commit history), just
// automated. Never run against a production project.

export type TestUser = { id: string; email: string; password: string };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function adminHeaders() {
  const key = requireEnv("SUPABASE_SECRET_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function createTestUser(label: string): Promise<TestUser> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const email = `e2e-${label}-${Date.now()}@example.com`;
  const password = "E2e-Test-Passw0rd!";

  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create test user: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return { id: data.id, email, password };
}

export async function deleteTestUser(userId: string): Promise<void> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete test user ${userId}: ${res.status} ${await res.text()}`);
  }
}
