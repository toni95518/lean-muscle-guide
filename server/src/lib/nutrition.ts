// Pure nutrition and energy math. No I/O, so it is easy to unit test
// and can be shared with any client.

export type Sex = "female" | "male";
export type Goal = "lose1" | "lose05" | "maintain" | "gain05";

export interface ProfileInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: number; // multiplier, e.g. 1.375
  goal: Goal;
  calorieOverride: number | null;
  proteinPerKg: number;
  waterGoal: number;
}

export interface Targets {
  bmr: number; // resting energy, kcal/day
  tdee: number; // maintenance, kcal/day
  calculatedKcal: number; // target before any override
  kcal: number; // target in effect
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  water: number; // glasses
}

export const GOAL_ADJUSTMENT: Record<Goal, number> = {
  lose1: -500,
  lose05: -250,
  maintain: 0,
  gain05: 250,
};

const FAT_SHARE = 0.28; // fraction of calories from fat
const MIN_KCAL: Record<Sex, number> = { female: 1200, male: 1500 };

/** Mifflin–St Jeor resting metabolic rate. */
export function bmr(p: Pick<ProfileInput, "sex" | "age" | "heightCm" | "weightKg">): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
}

export function targets(p: ProfileInput): Targets {
  const rest = bmr(p);
  const tdee = rest * p.activity;
  const calculatedKcal = Math.max(MIN_KCAL[p.sex], Math.round((tdee + GOAL_ADJUSTMENT[p.goal]) / 10) * 10);
  const kcal = p.calorieOverride ?? calculatedKcal;
  const protein = Math.round(p.proteinPerKg * p.weightKg);
  const fat = Math.round((kcal * FAT_SHARE) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return {
    bmr: Math.round(rest),
    tdee: Math.round(tdee),
    calculatedKcal,
    kcal,
    protein,
    carbs,
    fat,
    water: p.waterGoal,
  };
}

/** Calories burned: MET × 3.5 × kg ÷ 200 per minute. */
export function caloriesBurned(met: number, weightKg: number, minutes: number): number {
  return Math.round(((met * 3.5 * weightKg) / 200) * minutes);
}

export interface FoodLike {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
}
export interface ExerciseLike {
  kcal: number;
  minutes: number;
}

export interface DayTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  burned: number;
  activeMinutes: number;
  net: number; // eaten - burned
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function dayTotals(food: FoodLike[], exercise: ExerciseLike[]): DayTotals {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const f of food) {
    kcal += f.kcal * f.quantity;
    protein += f.protein * f.quantity;
    carbs += f.carbs * f.quantity;
    fat += f.fat * f.quantity;
  }
  const burned = exercise.reduce((a, e) => a + e.kcal, 0);
  const activeMinutes = exercise.reduce((a, e) => a + e.minutes, 0);
  return {
    kcal: Math.round(kcal),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
    burned,
    activeMinutes,
    net: Math.round(kcal) - burned,
  };
}

// Unit conversions for clients and imports. Storage is always kg / cm.
export const KG_PER_LB = 0.45359237;
export const KG_PER_JIN = 0.5;
export function toKg(value: number, unit: "kg" | "lb" | "jin"): number {
  return unit === "kg" ? value : unit === "lb" ? value * KG_PER_LB : value * KG_PER_JIN;
}
export function fromKg(kg: number, unit: "kg" | "lb" | "jin"): number {
  return unit === "kg" ? kg : unit === "lb" ? kg / KG_PER_LB : kg / KG_PER_JIN;
}
