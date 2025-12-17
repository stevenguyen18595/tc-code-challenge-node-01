import { defineConfig } from "vitest/config";
import { resolve } from "path";

const testDbPath = resolve(__dirname, "./prisma/test.db");

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      NODE_ENV: "test",
      DATABASE_URL: `file:${testDbPath}`,
    },
    hookTimeout: 60000, // Increase timeout for database setup
    testTimeout: 30000,
    fileParallelism: false, // Run test files sequentially to avoid database conflicts
    isolate: true, // Isolate each test file
    pool: "forks", // Use forks for better isolation
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        ".next/",
        "tests/",
        "**/*.test.ts",
        "**/*.config.ts",
        "prisma/",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
