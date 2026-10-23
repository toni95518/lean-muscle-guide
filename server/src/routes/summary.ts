import { and, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { dayLogs, exerciseEntries, foodEntries } from "../db/schema";
import { addDays, dateRange, isoDate } from "../lib/dates";
import { uid } from "../middleware/auth";
import { loadDays } from "../services/days";
import { getOrCreateProfile, targetsFor } from "../services/profile";

export const summaryRouter = Router();

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);

// GET /api/summary?to=2026-10-21&days=7
// `to` is the client's "today" (local date). Returns a day-by-day series plus totals.
summaryRouter.get("/summary", async (req, res) => {
  const userId = uid(req);
  const { to, days } = z
    .object({ to: isoDate, days: z.coerce.number().int().min(1).max(90).default(7) })
    .parse(req.query);
  const from = addDays(to, -(days - 1));

  const [loaded, profile, streak, weights] = await Promise.all([
    loadDays(userId, from, to),
    getOrCreateProfile(userId),
    loggingStreak(userId, to),
    db
      .select({ date: dayLogs.date, weightKg: dayLogs.weightKg })
      .from(dayLogs)
      .where(and(eq(dayLogs.userId, userId), isNotNull(dayLogs.weightKg), lte(dayLogs.date, to)))
      .orderBy(desc(dayLogs.date))
      .limit(30),
  ]);

  const byDate = new Map(loaded.map((d) => [d.date, d]));
  const series = dateRange(from, to).map((date) => {
    const d = byDate.get(date);
    return {
      date,
      kcal: d?.totals.kcal ?? 0,
      protein: d?.totals.protein ?? 0,
      carbs: d?.totals.carbs ?? 0,
      fat: d?.totals.fat ?? 0,
      burned: d?.totals.burned ?? 0,
      activeMinutes: d?.totals.activeMinutes ?? 0,
      workouts: d?.exercise.length ?? 0,
      waterGlasses: d?.waterGlasses ?? 0,
      foodLogged: (d?.food.length ?? 0) > 0,
    };
  });
  const logged = series.filter((s) => s.foodLogged);
  const weightSeries = weights.reverse().map((w) => ({ date: w.date, weightKg: w.weightKg! }));

  res.json({
    from,
    to,
    targets: targetsFor(profile),
    days: series,
    loggedDays: logged.length,
    averages: {
      kcal: r1(avg(logged.map((s) => s.kcal))),
      protein: r1(avg(logged.map((s) => s.protein))),
      waterGlasses: r1(avg(series.map((s) => s.waterGlasses))),
    },
    totals: {
      workouts: series.reduce((a, s) => a + s.workouts, 0),
      activeMinutes: series.reduce((a, s) => a + s.activeMinutes, 0),
      burned: series.reduce((a, s) => a + s.burned, 0),
    },
    streak,
    weight: {
      series: weightSeries,
      changeKg:
        weightSeries.length >= 2
          ? Math.round((weightSeries[weightSeries.length - 1].weightKg - weightSeries[0].weightKg) * 100) / 100
          : null,
    },
  });
});

/**
 * Consecutive days with any food or exercise logged, ending today.
 * An empty "today" doesn't break the streak (the day isn't over yet).
 */
async function loggingStreak(userId: string, today: string): Promise<number> {
  const since = addDays(today, -365);
  const [f, e] = await Promise.all([
    db
      .selectDistinct({ date: foodEntries.date })
      .from(foodEntries)
      .where(and(eq(foodEntries.userId, userId), gte(foodEntries.date, since), lte(foodEntries.date, today))),
    db
      .selectDistinct({ date: exerciseEntries.date })
      .from(exerciseEntries)
      .where(and(eq(exerciseEntries.userId, userId), gte(exerciseEntries.date, since), lte(exerciseEntries.date, today))),
  ]);
  const active = new Set([...f, ...e].map((r) => r.date));
  let day = active.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (active.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}
