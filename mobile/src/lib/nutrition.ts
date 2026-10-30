// Same formulas as server/src/lib/nutrition.ts.
export type Sex = "female" | "male";
export type Goal = "lose1" | "lose05" | "maintain" | "gain05";
export type WeightUnit = "kg" | "lb" | "jin";

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: number;
  goal: Goal;
  calorieOverride: number | null;
  proteinPerKg: number;
  waterGoal: number; // glasses of 250 ml
  weightUnit: WeightUnit;
  setupComplete: boolean;
}

export const DEFAULT_PROFILE: Profile = {
  sex: "female",
  age: 30,
  heightCm: 168,
  weightKg: 68,
  activity: 1.375,
  goal: "maintain",
  calorieOverride: null,
  proteinPerKg: 1.6,
  waterGoal: 8,
  weightUnit: "kg",
  setupComplete: false,
};

export const GOAL_ADJUSTMENT: Record<Goal, number> = { lose1: -500, lose05: -250, maintain: 0, gain05: 250 };
export const ACTIVITY_LEVELS = [1.2, 1.375, 1.55, 1.725];
export const PROTEIN_LEVELS: [number, "moderate" | "high" | "veryHigh"][] = [
  [1.2, "moderate"],
  [1.6, "high"],
  [2.0, "veryHigh"],
];

export interface Targets {
  bmr: number;
  tdee: number;
  auto: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

export function targets(p: Profile): Targets {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
  const tdee = bmr * p.activity;
  const auto = Math.max(p.sex === "male" ? 1500 : 1200, Math.round((tdee + GOAL_ADJUSTMENT[p.goal]) / 10) * 10);
  const kcal = p.calorieOverride ?? auto;
  const protein = Math.round(p.proteinPerKg * p.weightKg);
  const fat = Math.round((kcal * 0.28) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), auto, kcal, protein, carbs, fat, water: p.waterGoal };
}

/** MET × 3.5 × kg ÷ 200 per minute */
export const caloriesBurned = (met: number, weightKg: number, minutes: number) =>
  Math.round(((met * 3.5 * weightKg) / 200) * minutes);

export const KG_PER: Record<WeightUnit, number> = { kg: 1, lb: 0.45359237, jin: 0.5 };
export const toDisplayWeight = (kg: number, u: WeightUnit) => Math.round((kg / KG_PER[u]) * 10) / 10;
export const fromDisplayWeight = (v: number, u: WeightUnit) => v * KG_PER[u];
export const WEIGHT_LABEL: Record<WeightUnit, string> = { kg: "kg", lb: "lb", jin: "斤" };
export const GLASS_ML = 250;
export const liters = (glasses: number) => (glasses * GLASS_ML) / 1000;
