import { Client } from "pg";

// Rebuilds the test database from the migrations before the run.
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://fuel:fuel@localhost:5432/fuel_move_test?schema=public";
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = url;
  process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret-1234";

  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await client.end();

  const { runMigrations } = await import("../src/db/migrate");
  const { pool } = await import("../src/db");
  await runMigrations();
  await pool.end();
}
