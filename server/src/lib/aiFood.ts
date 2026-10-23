// "Ask your own AI": the app gives the user a prompt to paste into the AI
// assistant they already use (ChatGPT, Claude, 豆包, DeepSeek, …) together with
// a photo of their food. The assistant answers in a fixed JSON format, the user
// pastes the reply back, and parseAiFoodReply() turns it into food entries.
//
// No model runs on our server, so there is no API cost and the photo never
// reaches us. A future version can call a model directly through the same parser.

export type Lang = "en" | "zh";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export interface AiFoodItem {
  name: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AiFoodResult {
  items: AiFoodItem[];
  notes: string | null;
  totals: { kcal: number; protein: number; carbs: number; fat: number };
}

const MEAL_NAMES: Record<Lang, Record<Meal, string>> = {
  en: { breakfast: "breakfast", lunch: "lunch", dinner: "dinner", snack: "snack" },
  zh: { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐" },
};

export function foodPrompt(lang: Lang, meal?: Meal): string {
  if (lang === "zh") {
    const what = meal ? `我的${MEAL_NAMES.zh[meal]}` : "我吃的食物";
    return [
      `你是一名营养师。我会附上一张${what}的照片（或者用文字描述）。`,
      "请识别每一种食物，估计份量，并估算热量和三大营养素。",
      "只用下面的 JSON 格式回答，不要添加其他文字：",
      "```json",
      '{"items":[{"name":"鸡胸肉","portion":"约150克","kcal":248,"protein":46,"carbs":0,"fat":5}],"notes":"一句话说明你的估算假设"}',
      "```",
      "要求：热量单位为千卡（kcal），蛋白质、碳水、脂肪单位为克，全部取整数。",
      "看不清的地方请给出最合理的估计，并在 notes 里说明。",
    ].join("\n");
  }
  const what = meal ? `my ${MEAL_NAMES.en[meal]}` : "my food";
  return [
    `You are a nutrition assistant. I'm attaching a photo of ${what} (or I'll describe it).`,
    "Identify each food, estimate the portion, and estimate its calories and macros.",
    "Reply ONLY with JSON in exactly this format, with no other text:",
    "```json",
    '{"items":[{"name":"Grilled chicken breast","portion":"about 150 g","kcal":248,"protein":46,"carbs":0,"fat":5}],"notes":"one short sentence about your assumptions"}',
    "```",
    "Use kcal for energy and grams for protein, carbs and fat, rounded to whole numbers.",
    "If something is unclear, give your best estimate and say so in notes.",
  ].join("\n");
}

export class AiParseError extends Error {}

// Field names assistants commonly use, in English and Chinese.
const KEYS = {
  name: ["name", "food", "item", "dish", "名称", "食物", "菜品", "名字"],
  serving: ["portion", "serving", "amount", "quantity", "size", "份量", "分量", "重量", "数量"],
  kcal: ["kcal", "calories", "calorie", "cal", "energy", "热量", "卡路里", "千卡", "能量"],
  protein: ["protein", "protein_g", "proteins", "蛋白质", "蛋白"],
  carbs: ["carbs", "carbs_g", "carb", "carbohydrate", "carbohydrates", "碳水", "碳水化合物"],
  fat: ["fat", "fat_g", "fats", "脂肪"],
};

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const [k, v] of Object.entries(obj)) {
    if (keys.includes(k.trim().toLowerCase())) return v;
  }
  return undefined;
}

/** "250", 250, "250 kcal", "约250千卡", "1,200" → number; anything else → null */
function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const m = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** Finds the first balanced {...} or [...] block in free text, ignoring braces inside strings. */
function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const src = fenced ? fenced[1] : text;
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
    else if (c === close && --depth === 0) return src.slice(start, i + 1);
  }
  return null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function parseAiFoodReply(text: string): AiFoodResult {
  const raw = extractJson(text.replace(/[“”]/g, '"'));
  if (!raw) throw new AiParseError("Couldn't find the food list in that reply. Ask your AI to answer in the format from the prompt, then paste the whole reply.");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new AiParseError("The reply's food list isn't valid JSON. Ask your AI to answer again using exactly the format from the prompt.");
  }

  const list: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((pick(data as Record<string, unknown>, ["items", "foods", "食物", "列表"]) as unknown[]) ?? [data])
      : [];
  const notesRaw = data && typeof data === "object" && !Array.isArray(data) ? pick(data as Record<string, unknown>, ["notes", "note", "备注", "说明"]) : undefined;

  const items: AiFoodItem[] = [];
  for (const entry of Array.isArray(list) ? list : []) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const name = String(pick(o, KEYS.name) ?? "").trim();
    const kcal = num(pick(o, KEYS.kcal));
    if (!name || kcal == null || kcal < 0 || kcal > 5000) continue;
    const macro = (keys: string[]) => {
      const v = num(pick(o, keys));
      return v != null && v >= 0 && v <= 1000 ? round1(v) : 0;
    };
    items.push({
      name: name.slice(0, 120),
      serving: String(pick(o, KEYS.serving) ?? "1 serving").trim().slice(0, 60) || "1 serving",
      kcal: Math.round(kcal),
      protein: macro(KEYS.protein),
      carbs: macro(KEYS.carbs),
      fat: macro(KEYS.fat),
    });
    if (items.length === 30) break;
  }
  if (!items.length) throw new AiParseError("The reply didn't include any foods with calories. Ask your AI to try again with the prompt.");

  const sum = (k: "kcal" | "protein" | "carbs" | "fat") => round1(items.reduce((a, i) => a + i[k], 0));
  return {
    items,
    notes: typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim().slice(0, 300) : null,
    totals: { kcal: Math.round(sum("kcal")), protein: sum("protein"), carbs: sum("carbs"), fat: sum("fat") },
  };
}
