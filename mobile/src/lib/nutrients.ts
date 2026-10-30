// Optional nutrients beyond calories and macros. Each user picks which ones to track
// (Me → Nutrients); the AI then estimates those for every food it logs.
//
// Default daily targets are the U.S. FDA Daily Values for adults (21 CFR 101.9).
// "limit" nutrients should stay under the target (sodium, sugar…); "goal" nutrients
// should reach it (fiber, vitamins, minerals). Users can change any target.

export type NutrientId =
  | "sodium"
  | "sugar"
  | "satFat"
  | "cholesterol"
  | "fiber"
  | "potassium"
  | "calcium"
  | "iron"
  | "magnesium"
  | "zinc"
  | "vitA"
  | "vitC"
  | "vitD"
  | "vitB12"
  | "folate";

export interface NutrientInfo {
  id: NutrientId;
  unit: "g" | "mg" | "µg";
  dv: number; // default daily target
  kind: "limit" | "goal";
  json: string; // key the AI is asked to use, e.g. "sodium_mg"
  aliases: string[]; // other keys accepted from AI replies (lowercase)
  max: number; // sanity cap per serving; larger values are ignored
}

export const NUTRIENTS: NutrientInfo[] = [
  { id: "sodium", unit: "mg", dv: 2300, kind: "limit", json: "sodium_mg", aliases: ["sodium", "na", "salt_mg", "钠", "sodio"], max: 20000 },
  { id: "sugar", unit: "g", dv: 50, kind: "limit", json: "sugar_g", aliases: ["sugar", "sugars", "added_sugar_g", "糖", "sucre", "sucres", "zucker"], max: 500 },
  { id: "satFat", unit: "g", dv: 20, kind: "limit", json: "sat_fat_g", aliases: ["saturated_fat_g", "saturated_fat", "sat_fat", "饱和脂肪", "acides_gras_saturés", "gesättigte_fettsäuren"], max: 300 },
  { id: "cholesterol", unit: "mg", dv: 300, kind: "limit", json: "cholesterol_mg", aliases: ["cholesterol", "胆固醇", "cholestérol", "cholesterin"], max: 5000 },
  { id: "fiber", unit: "g", dv: 28, kind: "goal", json: "fiber_g", aliases: ["fiber", "fibre", "fibre_g", "dietary_fiber_g", "膳食纤维", "纤维", "fibres", "ballaststoffe"], max: 200 },
  { id: "potassium", unit: "mg", dv: 4700, kind: "goal", json: "potassium_mg", aliases: ["potassium", "钾", "kalium"], max: 20000 },
  { id: "calcium", unit: "mg", dv: 1300, kind: "goal", json: "calcium_mg", aliases: ["calcium", "ca", "钙", "kalzium"], max: 10000 },
  { id: "iron", unit: "mg", dv: 18, kind: "goal", json: "iron_mg", aliases: ["iron", "fe", "铁", "fer", "eisen"], max: 500 },
  { id: "magnesium", unit: "mg", dv: 420, kind: "goal", json: "magnesium_mg", aliases: ["magnesium", "镁"], max: 5000 },
  { id: "zinc", unit: "mg", dv: 11, kind: "goal", json: "zinc_mg", aliases: ["zinc", "zn", "锌", "zink"], max: 500 },
  { id: "vitA", unit: "µg", dv: 900, kind: "goal", json: "vitamin_a_ug", aliases: ["vitamin_a", "vitamin_a_mcg", "vit_a", "维生素a", "vitamine_a"], max: 50000 },
  { id: "vitC", unit: "mg", dv: 90, kind: "goal", json: "vitamin_c_mg", aliases: ["vitamin_c", "vit_c", "维生素c", "vitamine_c"], max: 5000 },
  { id: "vitD", unit: "µg", dv: 20, kind: "goal", json: "vitamin_d_ug", aliases: ["vitamin_d", "vitamin_d_mcg", "vit_d", "维生素d", "vitamine_d"], max: 1000 },
  { id: "vitB12", unit: "µg", dv: 2.4, kind: "goal", json: "vitamin_b12_ug", aliases: ["vitamin_b12", "vitamin_b12_mcg", "b12", "维生素b12", "vitamine_b12"], max: 1000 },
  { id: "folate", unit: "µg", dv: 400, kind: "goal", json: "folate_ug", aliases: ["folate", "folate_mcg", "folic_acid", "叶酸", "folsäure"], max: 10000 },
];

export const NUTRIENT_IDS = NUTRIENTS.map((n) => n.id);
export const nutrientInfo = (id: NutrientId) => NUTRIENTS.find((n) => n.id === id)!;

/** Amounts per serving (or per day for totals). Missing = not estimated. */
export type Micros = Partial<Record<NutrientId, number>>;

/** Reads nutrient values from an AI item, accepting the requested keys and common variants. */
export function readMicros(r: Record<string, unknown>, num: (v: unknown) => number | null): Micros | undefined {
  const lower = new Map(Object.entries(r).map(([k, v]) => [k.trim().toLowerCase().replace(/\s+/g, "_"), v]));
  const out: Micros = {};
  for (const n of NUTRIENTS) {
    for (const key of [n.json, ...n.aliases]) {
      if (!lower.has(key)) continue;
      const v = num(lower.get(key));
      if (v != null && v >= 0 && v <= n.max) out[n.id] = Math.round(v * 10) / 10;
      break;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/** Rounds for display: whole numbers, one decimal below 10. */
export const fmtAmount = (v: number) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
