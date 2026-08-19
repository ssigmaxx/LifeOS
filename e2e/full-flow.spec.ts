import path from "node:path";
import { test, expect } from "@playwright/test";
import { STORAGE_STATE_PATH } from "./global-setup";

test.use({ storageState: STORAGE_STATE_PATH });

// One long, ordered flow rather than independent tests — each step
// depends on state left by the previous one (the habit created in step 1
// is what step 2 logs, etc.), mirroring the exact flow named in the
// project spec: create habit → log habit → Today → Analytics → photo →
// AI Coach.
test("habit → log → Today → Analytics → photo → AI Coach", async ({ page }) => {
  const habitName = `E2E Habit ${Date.now()}`;

  await test.step("create a habit", async () => {
    await page.goto("/habits");
    await page.getByRole("button", { name: "Habit" }).click();
    await page.getByLabel("Name").fill(habitName);
    await page.getByRole("button", { name: "Create habit" }).click();
    await expect(page.getByText(habitName)).toBeVisible();
  });

  await test.step("log the habit done on Today", async () => {
    await page.goto("/today");
    await expect(page.getByText(habitName)).toBeVisible();
    // A fresh test account has exactly this one habit due today, so an
    // unscoped locator is unambiguous.
    await page.getByRole("button", { name: "Mark done" }).click();
    await expect(page.getByRole("button", { name: "Mark not done" })).toBeVisible();
  });

  await test.step("Today's score reflects the completed habit", async () => {
    await page.reload();
    await expect(page.getByText("100%")).toBeVisible();
  });

  await test.step("Analytics loads", async () => {
    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  });

  await test.step("upload a progress photo", async () => {
    // The upload widget only lives on Today (and on /photos once a photo
    // already exists) — a brand-new account's /photos page is an empty
    // state that just points here instead.
    await page.goto("/today");
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(path.join(__dirname, "fixtures", "test-photo.jpg"));
    await expect(page.getByRole("button", { name: /Delete Face photo/ })).toBeVisible({ timeout: 15_000 });
  });

  await test.step("ask the AI Coach a question", async () => {
    await page.goto("/ai-coach");
    const before = await page.locator("main").innerText();

    await page.getByPlaceholder("Ask anything…").fill("How am I doing on my habits today?");
    await page.getByRole("button", { name: "Send" }).click();

    // Either a real reply or the graceful "temporarily unavailable"
    // message is a pass here — this step verifies our own request/response
    // plumbing and error handling, not Gemini's uptime or quota.
    await expect(page.getByText("Thinking…")).toBeHidden({ timeout: 30_000 });
    await expect(async () => {
      const after = await page.locator("main").innerText();
      expect(after.length).toBeGreaterThan(before.length);
    }).toPass({ timeout: 5_000 });
  });
});
