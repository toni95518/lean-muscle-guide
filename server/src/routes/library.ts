import { and, asc, desc, eq, gte, ilike } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { activities, customFoods, foodEntries, foods } from "../db/schema";
import { addDays } from "../lib/dates";
import { notFound } from "../lib/errors";
import { caloriesBurned } from "../lib/nutrition";
import { idParam, likeEscape } from "../lib/params";
import { uid } from "../middleware/auth";
import { getOrCreateProfile } from "../services/profile";

export const libraryRouter = Router();

const searchQuery = z.object({
  q: z.string().trim().max(80).optional().default(""),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// GET /api/foods?q=chicken → the user's recent foods, saved foods, and library matches
libraryRouter.get("/foods", async (req, res) => {
  const userId = uid(req);
  const { q, limit } = searchQuery.parse(req.query);
  const pattern = `%${likeEscape(q)}%`;
  const today = new Date().toISOString().slice(0, 10);

  const [recentRows, custom, library] = await Promise.all([
    // Latest entry per distinct food name in the last 90 days
    db
      .selectDistinctOn([foodEntries.name], {
        name: foodEntries.name,
        serving: foodEntries.serving,
        kcal: foodEntries.kcal,
        protein: foodEntries.protein,
        carbs: foodEntries.carbs,
        fat: foodEntries.fat,
        meal: foodEntries.meal,
        foodId: foodEntries.foodId,
        customFoodId: foodEntries.customFoodId,
        lastUsed: foodEntries.createdAt,
      })
      .from(foodEntries)
      .where(
        and(
          eq(foodEntries.userId, userId),
          gte(foodEntries.date, addDays(today, -90)),
          q ? ilike(foodEntries.name, pattern) : undefined,
        ),
      )
      .orderBy(foodEntries.name, desc(foodEntries.createdAt)),
    db
      .select()
      .from(customFoods)
      .where(and(eq(customFoods.userId, userId), q ? ilike(customFoods.name, pattern) : undefined))
      .orderBy(asc(customFoods.name))
      .limit(limit),
    db
      .select()
      .from(foods)
      .where(q ? ilike(foods.name, pattern) : undefined)
      .orderBy(asc(foods.name))
      .limit(limit),
  ]);

  const recent = recentRows
    .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
    .slice(0, q ? 10 : 12)
    .map((r) => ({ ...r, lastUsed: r.lastUsed.toISOString() }));
  res.json({
    recent,
    custom: custom.map(({ userId: _u, createdAt, ...c }) => ({ ...c, createdAt: createdAt.toISOString() })),
    library,
  });
});

const customBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    serving: z.string().trim().max(60).default("1 serving"),
    kcal: z.number().min(0).max(10000),
    protein: z.number().min(0).max(5000).default(0),
    carbs: z.number().min(0).max(5000).default(0),
    fat: z.number().min(0).max(5000).default(0),
  })
  .strict();

// Save (or update by name) a custom food
libraryRouter.post("/foods/custom", async (req, res) => {
  const body = customBody.parse(req.body);
  const [food] = await db
    .insert(customFoods)
    .values({ userId: uid(req), ...body })
    .onConflictDoUpdate({ target: [customFoods.userId, customFoods.name], set: body })
    .returning();
  const { userId: _u, createdAt, ...rest } = food;
  res.status(201).json({ ...rest, createdAt: createdAt.toISOString() });
});

libraryRouter.delete("/foods/custom/:id", async (req, res) => {
  const id = idParam(req, "Saved food");
  const [gone] = await db
    .delete(customFoods)
    .where(and(eq(customFoods.id, id), eq(customFoods.userId, uid(req))))
    .returning({ id: customFoods.id });
  if (!gone) throw notFound("Saved food");
  res.status(204).end();
});

// GET /api/activities?q=run → activities with a calorie estimate for this user
libraryRouter.get("/activities", async (req, res) => {
  const { q } = searchQuery.parse(req.query);
  const [profile, rows] = await Promise.all([
    getOrCreateProfile(uid(req)),
    db
      .select()
      .from(activities)
      .where(q ? ilike(activities.name, `%${likeEscape(q)}%`) : undefined)
      .orderBy(asc(activities.met)),
  ]);
  res.json({
    weightKg: profile.weightKg,
    activities: rows.map((a) => ({ ...a, kcalPer30Min: caloriesBurned(a.met, profile.weightKg, 30) })),
  });
});

// POST /api/activities/estimate → calories for a given activity/MET and duration
libraryRouter.post("/activities/estimate", async (req, res) => {
  const b = z
    .object({ activityId: z.string().uuid().optional(), met: z.number().min(1).max(25).optional(), minutes: z.number().min(1).max(1440) })
    .refine((x) => x.activityId || x.met, { message: "Send an activityId or a met value" })
    .parse(req.body);
  let met = b.met;
  if (b.activityId) {
    const [a] = await db.select().from(activities).where(eq(activities.id, b.activityId));
    if (!a) throw notFound("Activity");
    met = a.met;
  }
  const profile = await getOrCreateProfile(uid(req));
  res.json({ met, minutes: b.minutes, weightKg: profile.weightKg, kcal: caloriesBurned(met!, profile.weightKg, b.minutes) });
});

