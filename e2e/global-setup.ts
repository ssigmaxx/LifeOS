import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createTestUser } from "./test-user";

const AUTH_DIR = path.join(__dirname, ".auth");
export const STORAGE_STATE_PATH = path.join(AUTH_DIR, "user.json");
export const USER_RECORD_PATH = path.join(AUTH_DIR, "user.record.json");

export default async function globalSetup(config: FullConfig) {
  process.loadEnvFile(path.join(__dirname, "..", ".env.local"));
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const user = await createTestUser("flow");
  fs.writeFileSync(USER_RECORD_PATH, JSON.stringify(user));

  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/login`);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(baseURL + "/");

  await page.context().storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}
