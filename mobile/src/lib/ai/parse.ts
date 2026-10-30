// Turns an AI reply into structured items. Tolerant of code fences, chatter around
// the JSON, smart quotes, unit strings ("520 kcal", "约520千卡") and common key names
// in English, Chinese, French and German. (Same approach as server/src/lib/aiFood.ts.)
import { isDateKey } from "../dates";
import { MEALS, type CoachAction, type Meal, type NewExercise, type NewFood } from "../store";

export interface ParsedFood extends NewFood {
  confidence?: "high" | "medium" | "low";
}
export interface ParsedLog {
  foods: ParsedFood[];
  exercises: NewExercise[];
  notes: string | null;
}

const KEYS = {
  name: ["name", "food", "item", "dish", "名称", "食物", "菜品", "名字", "nom", "aliment", "plat", "lebensmittel", "gericht", "activity", "exercise", "运动"],
  serving: ["portion", "serving", "amount", "quantity", "size", "份量", "分量", "重量", "数量", "quantité", "menge", "größe"],
  kcal: ["kcal", "calories", "calorie", "cal", "energy", "热量", "卡路里", "千卡", "能量", "énergie", "kalorien", "energie"],
  protein: ["protein", "protein_g", "proteins", "蛋白质", "蛋白", "protéines", "proteines", "eiweiß", "eiweiss", "proteine"],
  carbs: ["carbs", "carbs_g", "carb", "carbohydrate", "carbohydrates", "碳水", "碳水化合物", "glucides", "kohlenhydrate"],
  fat: ["fat", "fat_g", "fats", "脂肪", "lipides", "graisses", "fett"],
  minutes: ["minutes", "duration", "min", "时长", "分钟", "durée", "dauer"],
};

function pick(o: Record<string, unknown>, keys: string[]): unknown {
  for (const [k, v] of Object.entries(o)) if (keys.includes(k.trim().toLowerCase())) return v;
  return undefined;
}
function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const m = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
const r1 = (n: number) => Math.round(n * 10) / 10;

/** First balanced {...} or [...] in the text, ignoring braces inside strings. */
export function extractJson(text: string): unknown | null {
  const clean = text.replace(/[“”]/g, '"');
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const src = fenced ? fenced[1] : clean;
  const start = src.search(/[{[]/);
  if (start < 0) return null;
  const open = src[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) {
      try {
        return JSON.parse(src.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

const asMeal = (v: unknown): Meal | undefined => (MEALS.includes(v as Meal) ? (v as Meal) : undefined);

export function toFood(o: unknown): ParsedFood | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const name = String(pick(r, KEYS.name) ?? "").trim();
  const kcal = num(pick(r, KEYS.kcal));
  if (!name || kcal == null || kcal < 0 || kcal > 5000) return null;
  const m = (keys: string[]) => {
    const v = num(pick(r, keys));
    return v != null && v >= 0 && v <= 1000 ? r1(v) : 0;
  };
  const conf = String(r.confidence ?? "").toLowerCase();
  return {
    name: name.slice(0, 120),
    serving: String(pick(r, KEYS.serving) ?? "").trim().slice(0, 60) || "1 serving",
    kcal: Math.round(kcal),
    protein: m(KEYS.protein),
    carbs: m(KEYS.carbs),
    fat: m(KEYS.fat),
    quantity: 1,
    meal: asMeal(r.meal),
    confidence: conf === "high" || conf === "medium" || conf === "low" ? conf : undefined,
  };
}
export function toExercise(o: unknown): NewExercise | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const name = String(pick(r, KEYS.name) ?? "").trim();
  const kcal = num(pick(r, KEYS.kcal));
  const minutes = num(pick(r, KEYS.minutes)) ?? 0;
  if (!name || kcal == null || kcal < 0 || kcal > 5000) return null;
  return { name: name.slice(0, 120), kcal: Math.round(kcal), minutes: Math.max(0, Math.min(1440, Math.round(minutes))) };
}

export class ParseError extends Error {}

/** Reads the reply to the photo / say-it prompt. */
export function parseLogReply(text: string): ParsedLog {
  const data = extractJson(text);
  if (data == null) throw new ParseError("no_json");
  const obj = (Array.isArray(data) ? { foods: data } : data) as Record<string, unknown>;
  const foodsRaw = (pick(obj, ["foods", "items", "food", "食物", "aliments", "lebensmittel"]) as unknown[]) ?? [];
  const exRaw = (pick(obj, ["exercises", "exercise", "workouts", "运动", "activités", "training"]) as unknown[]) ?? [];
  const foods = (Array.isArray(foodsRaw) ? foodsRaw : []).map(toFood).filter((x): x is ParsedFood => !!x).slice(0, 30);
  const exercises = (Array.isArray(exRaw) ? exRaw : []).map(toExercise).filter((x): x is NewExercise => !!x).slice(0, 10);
  if (!foods.length && !exercises.length) throw new ParseError("empty");
  const notes = pick(obj, ["notes", "note", "备注", "说明", "remarques", "hinweise"]);
  return { foods, exercises, notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 300) : null };
}

/** Reads the coach's reply: a message plus proposed actions. Plain text is accepted as a message. */
export function parseCoachReply(text: string, fallbackDate: string): { reply: string; actions: CoachAction[] } {
  const data = extractJson(text);
  if (!data || typeof data !== "object" || Array.isArray(data)) return { reply: text.trim(), actions: [] };
  const o = data as Record<string, unknown>;
  const reply = typeof o.reply === "string" && o.reply.trim() ? o.reply.trim() : text.replace(/```[\s\S]*?```/g, "").trim();
  const actions: CoachAction[] = [];
  for (const a of Array.isArray(o.actions) ? o.actions : []) {
    if (!a || typeof a !== "object") continue;
    const r = a as Record<string, unknown>;
    const date = isDateKey(r.date) ? r.date : fallbackDate;
    const items = Array.isArray(r.items) ? r.items : [];
    if (r.type === "add_food") {
      const foods = items.map(toFood).filter((x): x is ParsedFood => !!x);
      if (foods.length) actions.push({ type: "add_food", date, meal: asMeal(r.meal) ?? "snack", items: foods });
    } else if (r.type === "add_exercise") {
      const ex = items.map(toExercise).filter((x): x is NewExercise => !!x);
      if (ex.length) actions.push({ type: "add_exercise", date, items: ex });
    }
  }
  return { reply: reply || "…", actions: actions.slice(0, 6) };
}
