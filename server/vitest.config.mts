import { defineConfig } from "vitest/config";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://fuel:fuel@localhost:5432/fuel_move_test?schema=public";

export default defineConfig({
  test: {
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DB,
      JWT_SECRET: "test-secret-test-secret-test-secret-1234",
    },
    fileParallelism: false,
  },
});
