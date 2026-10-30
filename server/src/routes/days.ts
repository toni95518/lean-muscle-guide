import { and, desc, eq, isNotNull } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { activities, customFoods, dayLogs, exerciseEntries, foodEntries, foods, profiles } from "../db/schema";
import { addDays, daysBetween, isoDate } from "../lib/dates";
import { HttpError, notFound } from "../lib/errors";
import { caloriesBurned } from "../lib/nutrition";
import { dateParam, idParam } from "../lib/params";
import { uid } from "../middleware/auth";
import { loadDay, loadDays, serializeExercise, serializeFood } from "../services/days";
import { getOrCreateProfile } from "../services/profile";

export const daysRouter = Router();

const MAX_RANGE_DAYS = 366;

// ---------- reading days ----------

// GET /api/days?from=2026-09-01&to=2026-10-21 → days that have any data
daysRouter.get("/days", async (req, res) => {
  const { from, to } = z.object({ from: isoDate, to: isoDate }).parse(req.query);
  if (from > to) throw new HttpError(400, "invalid_range", "`from` must be on or before `to`");
  if (daysBetween(from, to) > MAX_RANGE_DAYS) {
    throw new HttpError(400, "invalid_range", `Ask for at most ${MAX_RANGE_DAYS} days at a time`);
  }
  res.json({ from, to, days: await loadDays(uid(req), from, to) });
});

daysRouter.get("/days/:date", async (req, res) => {
  res.json(await loadDay(uid(req), dateParam(req)));
});

// ---------- water & weight ----------

daysRouter.put("/days/:date/water", async (req, res) => {
  const date = dateParam(req);
  const { glasses } = z.object({ glasses: z.number().int().min(0).max(40) }).parse(req.body);
  await db
    .insert(dayLogs)
    .values({ userId: uid(req), date, waterGlasses: glasses })
    .onConflictDoUpdate({ target: [dayLogs.userId, dayLogs.date], set: { waterGlasses: glasses } });
  res.json({ date, waterGlasses: glasses });
});

daysRouter.put("/days/:date/weight", async (req, res) => {
  const userId = uid(req);
  const date = dateParam(req);
  const { weightKg } = z.object({ weightKg: z.number().min(25).max(400).nullable() }).parse(req.body);
  // Future days can hold planned meals and workouts, but not a weigh-in: it would
  // become the "latest" weight and change today's targets. (+1 day allows for time zones.)
  if (weightKg != null && date > addDays(new Date().toISOString().slice(0, 10), 1)) {
    throw new HttpError(400, "future_weight", "You can only log weight for today or earlier");
  }
  const value = weightKg == null ? null : Math.round(weightKg * 100) / 100;
  await db
    .insert(dayLogs)
    .values({ userId, date, weightKg: value })
    .onConflictDoUpdate({ target: [dayLogs.userId, dayLogs.date], set: { weightKg: value } });

  // Keep the profile's weight (used for targets and calorie burn) equal to the latest weigh-in.
  const [latest] = await db
    .select({ date: dayLogs.date, weightKg: dayLogs.weightKg })
    .from(dayLogs)
    .where(and(eq(dayLogs.userId, userId), isNotNull(dayLogs.weightKg)))
    .orderBy(desc(dayLogs.date))
    .limit(1);
  let profileUpdated = false;
  if (latest?.weightKg != null) {
    await getOrCreateProfile(userId);
    await db.update(profiles).set({ weightKg: latest.weightKg }).where(eq(profiles.userId, userId));
    profileUpdated = latest.date === date;
  }
  res.json({ date, weightKg: value, profileWeightKg: latest?.weightKg ?? null, profileUpdated });
});

// ---------- food ----------

const macro = z.number().min(0).max(5000);
const meal = z.enum(["breakfast", "lunch", "dinner", "snack"]);

const newFood = z
  .object({
    meal,
    quantity: z.number().min(0.1).max(50).default(1),
    foodId: z.string().uuid().optional(), // from the shared library
    customFoodId: z.string().uuid().optional(), // one of the user's saved foods
    name: z.string().trim().min(1).max(120).optional(),
    serving: z.string().trim().max(60).optional(),
    kcal: z.number().min(0).max(10000).optional(),
    protein: macro.optional(),
    carbs: macro.optional(),
    fat: macro.optional(),
    saveAsCustom: z.boolean().optional(), // also save this food for reuse
    source: z.enum(["manual", "quick", "ai", "photo"]).optional(),
  })
  .strict()
  .refine((b) => b.foodId || b.customFoodId || (b.name && b.kcal != null), {
    message: "Send a foodId, a customFoodId, or a name and kcal",
  });

daysRouter.post("/days/:date/food", async (req, res) => {
  const userId = uid(req);
  const date = dateParam(req);
  const b = newFood.parse(req.body);

  let values: typeof foodEntries.$inferInsert;
  if (b.foodId) {
    const [f] = await db.select().from(foods).where(eq(foods.id, b.foodId));
    if (!f) throw notFound("Food");
    const { id, ...nutr } = f;
    values = { ...nutr, foodId: id, source: "library", userId, date, meal: b.meal, quantity: b.quantity };
  } else if (b.customFoodId) {
    const [f] = await db
      .select()
      .from(customFoods)
      .where(and(eq(customFoods.id, b.customFoodId), eq(customFoods.userId, userId)));
    if (!f) throw notFound("Saved food");
    const { name, serving, kcal, protein, carbs, fat } = f;
    values = { name, serving, kcal, protein, carbs, fat, customFoodId: f.id, source: "custom", userId, date, meal: b.meal, quantity: b.quantity };
  } else {
    const nutr = {
      name: b.name!,
      serving: b.serving || "1 serving",
      kcal: b.kcal!,
      protein: b.protein ?? 0,
      carbs: b.carbs ?? 0,
      fat: b.fat ?? 0,
    };
    let customFoodId: string | undefined;
    if (b.saveAsCustom) {
      const [saved] = await db
        .insert(customFoods)
        .values({ userId, ...nutr })
        .onConflictDoUpdate({ target: [customFoods.userId, customFoods.name], set: nutr })
        .returning({ id: customFoods.id });
      customFoodId = saved.id;
    }
    values = { ...nutr, customFoodId, source: b.source ?? (customFoodId ? "custom" : "manual"), userId, date, meal: b.meal, quantity: b.quantity };
  }
  const [entry] = await db.insert(foodEntries).values(values).returning();
  res.status(201).json(serializeFood(entry));
});

// Log several foods at once, e.g. every item from an AI estimate of one photo.
const batchFood = z
  .object({
    meal,
    source: z.enum(["manual", "quick", "ai", "photo"]).default("manual"),
    items: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(120),
            serving: z.string().trim().max(60).optional(),
            kcal: z.number().min(0).max(10000),
            protein: macro.default(0),
            carbs: macro.default(0),
            fat: macro.default(0),
            quantity: z.number().min(0.1).max(50).default(1),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict();

daysRouter.post("/days/:date/food/batch", async (req, res) => {
  const userId = uid(req);
  const date = dateParam(req);
  const b = batchFood.parse(req.body);
  const rows = await db
    .insert(foodEntries)
    .values(b.items.map((i) => ({ ...i, serving: i.serving || "1 serving", userId, date, meal: b.meal, source: b.source })))
    .returning();
  res.status(201).json({ entries: rows.map(serializeFood) });
});

const foodPatch = z
  .object({
    date: isoDate,
    meal,
    quantity: z.number().min(0.1).max(50),
    name: z.string().trim().min(1).max(120),
    serving: z.string().trim().max(60),
    kcal: z.number().min(0).max(10000),
    protein: macro,
    carbs: macro,
    fat: macro,
  })
  .partial()
  .strict();

daysRouter.patch("/food/:id", async (req, res) => {
  const id = idParam(req, "Food entry");
  const patch = foodPatch.parse(req.body);
  const [entry] = await db
    .update(foodEntries)
    .set(patch)
    .where(and(eq(foodEntries.id, id), eq(foodEntries.userId, uid(req))))
    .returning();
  if (!entry) throw notFound("Food entry");
  res.json(serializeFood(entry));
});

daysRouter.delete("/food/:id", async (req, res) => {
  const id = idParam(req, "Food entry");
  const [gone] = await db
    .delete(foodEntries)
    .where(and(eq(foodEntries.id, id), eq(foodEntries.userId, uid(req))))
    .returning({ id: foodEntries.id });
  if (!gone) throw notFound("Food entry");
  res.status(204).end();
});

// ---------- exercise ----------

const newExercise = z
  .object({
    activityId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(120).optional(),
    minutes: z.number().int().min(0).max(1440).default(0), // 0 = not recorded
    kcal: z.number().min(0).max(10000).optional(), // omit to estimate from the activity's MET
    note: z.string().trim().max(200).optional(),
    source: z.enum(["manual", "quick", "ai", "apple_health", "werun", "fitbit"]).optional(),
  })
  .strict()
  .refine((b) => b.activityId || (b.name && b.kcal != null), {
    message: "Send an activityId, or a name and kcal",
  })
  .refine((b) => b.kcal != null || b.minutes > 0, {
    message: "Send minutes so calories can be estimated, or send kcal",
    path: ["minutes"],
  });

daysRouter.post("/days/:date/exercise", async (req, res) => {
  const userId = uid(req);
  const date = dateParam(req);
  const b = newExercise.parse(req.body);

  let name = b.name;
  let met: number | null = null;
  if (b.activityId) {
    const [a] = await db.select().from(activities).where(eq(activities.id, b.activityId));
    if (!a) throw notFound("Activity");
    name = name ?? a.name;
    met = a.met;
  }
  let kcal = b.kcal;
  if (kcal == null) {
    const profile = await getOrCreateProfile(userId);
    kcal = caloriesBurned(met!, profile.weightKg, b.minutes);
  }
  const [entry] = await db
    .insert(exerciseEntries)
    .values({
      userId,
      date,
      name: name!,
      minutes: b.minutes,
      kcal: Math.round(kcal),
      met,
      note: b.note || null,
      activityId: b.activityId ?? null,
      source: b.source ?? "manual",
    })
    .returning();
  res.status(201).json(serializeExercise(entry));
});

const exercisePatch = z
  .object({
    date: isoDate,
    name: z.string().trim().min(1).max(120),
    minutes: z.number().int().min(0).max(1440),
    kcal: z.number().min(0).max(10000),
    note: z.string().trim().max(200).nullable(),
  })
  .partial()
  .strict();

daysRouter.patch("/exercise/:id", async (req, res) => {
  const userId = uid(req);
  const id = idParam(req, "Exercise entry");
  const patch = exercisePatch.parse(req.body);
  const [current] = await db
    .select()
    .from(exerciseEntries)
    .where(and(eq(exerciseEntries.id, id), eq(exerciseEntries.userId, userId)));
  if (!current) throw notFound("Exercise entry");

  const set: Partial<typeof exerciseEntries.$inferInsert> = { ...patch };
  if (patch.kcal != null) set.kcal = Math.round(patch.kcal);
  // Re-estimate calories when the duration changes and the client didn't send a number.
  if (patch.minutes && patch.kcal == null && current.met != null) {
    const profile = await getOrCreateProfile(userId);
    set.kcal = caloriesBurned(current.met, profile.weightKg, patch.minutes);
  }
  const [entry] = await db.update(exerciseEntries).set(set).where(eq(exerciseEntries.id, id)).returning();
  res.json(serializeExercise(entry));
});

daysRouter.delete("/exercise/:id", async (req, res) => {
  const id = idParam(req, "Exercise entry");
  const [gone] = await db
    .delete(exerciseEntries)
    .where(and(eq(exerciseEntries.id, id), eq(exerciseEntries.userId, uid(req))))
    .returning({ id: exerciseEntries.id });
  if (!gone) throw notFound("Exercise entry");
  res.status(204).end();
});
