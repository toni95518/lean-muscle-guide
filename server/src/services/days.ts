import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { dayLogs, exerciseEntries, foodEntries, type ExerciseEntry, type FoodEntry } from "../db/schema";
import { dayTotals, type DayTotals } from "../lib/nutrition";

export function serializeFood(f: FoodEntry) {
  const { userId: _u, createdAt, ...rest } = f;
  return { ...rest, createdAt: createdAt.toISOString() };
}
export function serializeExercise(e: ExerciseEntry) {
  const { userId: _u, createdAt, ...rest } = e;
  return { ...rest, createdAt: createdAt.toISOString() };
}

export interface Day {
  date: string;
  waterGlasses: number;
  weightKg: number | null;
  food: ReturnType<typeof serializeFood>[];
  exercise: ReturnType<typeof serializeExercise>[];
  totals: DayTotals;
}

/**
 * Loads every day in [from, to] that has any data, in date order.
 * Three indexed queries regardless of range length.
 */
export async function loadDays(userId: string, from: string, to: string): Promise<Day[]> {
  const [logs, food, exercise] = await Promise.all([
    db
      .select()
      .from(dayLogs)
      .where(and(eq(dayLogs.userId, userId), gte(dayLogs.date, from), lte(dayLogs.date, to))),
    db
      .select()
      .from(foodEntries)
      .where(and(eq(foodEntries.userId, userId), gte(foodEntries.date, from), lte(foodEntries.date, to)))
      .orderBy(asc(foodEntries.createdAt)),
    db
      .select()
      .from(exerciseEntries)
      .where(and(eq(exerciseEntries.userId, userId), gte(exerciseEntries.date, from), lte(exerciseEntries.date, to)))
      .orderBy(asc(exerciseEntries.createdAt)),
  ]);

  const byDate = new Map<string, { log?: (typeof logs)[number]; food: FoodEntry[]; exercise: ExerciseEntry[] }>();
  const slot = (d: string) => {
    let s = byDate.get(d);
    if (!s) byDate.set(d, (s = { food: [], exercise: [] }));
    return s;
  };
  for (const l of logs) slot(l.date).log = l;
  for (const f of food) slot(f.date).food.push(f);
  for (const e of exercise) slot(e.date).exercise.push(e);

  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, s]) => buildDay(date, s.log?.waterGlasses ?? 0, s.log?.weightKg ?? null, s.food, s.exercise))
    .filter((d) => d.food.length || d.exercise.length || d.waterGlasses || d.weightKg != null);
}

export async function loadDay(userId: string, date: string): Promise<Day> {
  const [day] = await loadDays(userId, date, date);
  return day ?? buildDay(date, 0, null, [], []);
}

function buildDay(date: string, water: number, weightKg: number | null, food: FoodEntry[], exercise: ExerciseEntry[]): Day {
  return {
    date,
    waterGlasses: water,
    weightKg,
    food: food.map(serializeFood),
    exercise: exercise.map(serializeExercise),
    totals: dayTotals(food, exercise),
  };
}
