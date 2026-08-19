import fs from "node:fs";
import path from "node:path";
import { deleteTestUser, type TestUser } from "./test-user";
import { USER_RECORD_PATH } from "./global-setup";

export default async function globalTeardown() {
  process.loadEnvFile(path.join(__dirname, "..", ".env.local"));

  if (fs.existsSync(USER_RECORD_PATH)) {
    const user: TestUser = JSON.parse(fs.readFileSync(USER_RECORD_PATH, "utf-8"));
    await deleteTestUser(user.id);
    fs.rmSync(USER_RECORD_PATH, { force: true });
  }
}
