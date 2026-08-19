import path from "node:path";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(path.join(__dirname, "..", ".env.local"));

// Unauthenticated specs — deliberately don't use the shared storageState
// (Playwright config only applies it to specs that opt in via
// test.use({storageState}); these run with a clean, logged-out context by
// default since no such override is set here).

test("protected route redirects to /login when signed out", async ({ page }) => {
  await page.goto("/today");
  await expect(page).toHaveURL(/\/login/);
});

test("signup form creates an account", async ({ page }) => {
  // Supabase's public signUp endpoint validates deliverability and rejects
  // known-fake domains like example.com (unlike the admin-create-user API
  // used elsewhere in this suite, which skips that check entirely). A "+"
  // alias on the project owner's real address passes validation and routes
  // to the same inbox — this does send one real confirmation email per run.
  const email = `sssigmaxx+e2e-signup-${Date.now()}@gmail.com`;
  const password = "E2e-Test-Passw0rd!";

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  // Depending on the project's email-confirmation setting, signup either
  // signs the user straight in or shows a "check your email" state —
  // both are a valid pass; either means the account was created.
  await expect(async () => {
    const onDashboard = page.url() === new URL("/", page.url()).toString();
    const checkEmailVisible = await page.getByText("Check your email").isVisible().catch(() => false);
    expect(onDashboard || checkEmailVisible).toBe(true);
  }).toPass({ timeout: 10_000 });

  // Best-effort cleanup: the account was created via the real signup
  // flow, not the admin API, so look it up by email to delete it.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;
  const admin = createClient(supabaseUrl, secretKey);
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const created = data?.users.find((u) => u.email === email);
  if (created) await admin.auth.admin.deleteUser(created.id);
});
