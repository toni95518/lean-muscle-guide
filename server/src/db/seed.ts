import { sql } from "drizzle-orm";
import { ACTIVITIES, FOODS } from "../data/library";
import type { DB } from "./index";
import { activities, foods } from "./schema";

// Idempotent: safe to run on every deploy.
export async function seed(db: DB) {
  await db
    .insert(foods)
    .values(FOODS.map(([name, serving, kcal, protein, carbs, fat]) => ({ name, serving, kcal, protein, carbs, fat })))
    .onConflictDoUpdate({
      target: foods.name,
      set: {
        serving: sql`excluded.serving`,
        kcal: sql`excluded.kcal`,
        protein: sql`excluded.protein`,
        carbs: sql`excluded.carbs`,
        fat: sql`excluded.fat`,
      },
    });
  await db
    .insert(activities)
    .values(ACTIVITIES.map(([name, met]) => ({ name, met })))
    .onConflictDoUpdate({ target: activities.name, set: { met: sql`excluded.met` } });
}

if (require.main === module) {
  (async () => {
    const { db, pool } = await import("./index");
    await seed(db);
    console.log(`Seeded ${FOODS.length} foods and ${ACTIVITIES.length} activities`);
    await pool.end();
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
