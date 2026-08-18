import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Excludes .claude/worktrees/** too — background-task worktrees live
    // inside the repo and would otherwise get double-counted.
    exclude: ["**/node_modules/**", "**/.claude/**"],
  },
});
