// Applies pending SQL migrations from ./drizzle, then seeds the libraries.
// Run on every deploy: `npm run db:migrate`.
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";
import { seed } from "./seed";

export async function runMigrations() {
  await migrate(db, { migrationsFolder: path.join(__dirname, "../../drizzle") });
  await seed(db);
}

if (require.main === module) {
  runMigrations()
    .then(() => console.log("Database is up to date"))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
