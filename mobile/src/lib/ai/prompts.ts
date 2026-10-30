// Prompts sent to the user's AI. JSON keys stay in English; the content is in the user's language.
import { parseKey } from "../dates";
import { NUTRIENTS, nutrientInfo, type NutrientId } from "../nutrients";
import type { Profile, Targets } from "../nutrition";
import type { Day, Favorite, Lang, Meal } from "../store";
import { totals } from "../store";

const LANG_NAME: Record<Lang, string> = { en: "English", zh: "Simplified Chinese", fr: "French", de: "German" };

const LOG_FORMAT = `{"foods":[{"name":"Grilled chicken breast","portion":"about 150 g","kcal":248,"protein":46,"carbs":0,"fat":5,"confidence":"high","meal":"dinner"}],"exercises":[{"name":"Running","minutes":30,"kcal":350}],"notes":"one short sentence about your assumptions"}`;

/** Extra JSON fields for the nutrients the user tracks, e.g. "sodium_mg":520. */
function nutrientRule(ids: NutrientId[]): string {
  if (!ids.length) return "";
  const fields = NUTRIENTS.filter((n) => ids.includes(n.id)).map((n) => `"${n.json}"`).join(", ");
  return `- Also estimate these for each food, per portion, as numbers in the unit in the key name (mg, g, or ug for micrograms): ${fields}. Use typical values for the dish (restaurant and processed food is often high in sodium). Use 0 only if the food really has none.`;
}

export function logSystemPrompt(lang: Lang, weightKg: number, nutrients: NutrientId[] = []): string {
  return [
    "You are a nutrition assistant inside a calorie-tracking app.",
    "From a photo of food and/or the user's own words, list each food with its estimated portion, calories and macros, and any exercise they mention.",
    `Reply ONLY with JSON in exactly this shape, no other text:\n${LOG_FORMAT}`,
    "Rules:",
    "- kcal for energy; grams for protein, carbs and fat; whole numbers.",
    nutrientRule(nutrients),
    '- "confidence" is high, medium or low depending on how sure you are of the food and portion.',
    '- "meal" (breakfast, lunch, dinner or snack) only when the user says which meal; otherwise leave it out.',
    `- Estimate exercise calories for a person weighing ${Math.round(weightKg)} kg. Use an empty list when there is no exercise.`,
    "- If something is unclear, give your best estimate and say so in notes. Never refuse; never add foods that are not there.",
    `- Write names, portions and notes in ${LANG_NAME[lang]}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function logUserPrompt(opts: { meal: Meal; note?: string; text?: string; hasPhoto: boolean }): string {
  const parts: string[] = [];
  if (opts.hasPhoto) parts.push(`This is a photo of my ${opts.meal}.`);
  if (opts.text) parts.push(`What I ate or did: ${opts.text}`);
  if (opts.note) parts.push(`Note: ${opts.note}`);
  parts.push(`If I don't say which meal, it is ${opts.meal}.`);
  return parts.join("\n");
}

export interface CoachContext {
  today: string;
  profile: Profile;
  targets: Targets;
  week: Day[]; // last 7 days, oldest first, ending today
  favorites: Favorite[];
}

/** Today's tracked nutrients vs targets, for the coach. */
function nutrientLines(profile: Profile, today?: Day): string {
  if (!profile.nutrients.length) return "";
  const t = today ? totals(today) : null;
  const rows = profile.nutrients.map((id) => {
    const n = nutrientInfo(id);
    const target = profile.nutrientTargets[id] ?? n.dv;
    const v = t?.micros[id];
    return `${n.json.replace(/_(mg|g|ug)$/, "")}: ${v != null ? Math.round(v * 10) / 10 : "unknown"} of ${n.kind === "limit" ? "max " : ""}${target} ${n.unit === "µg" ? "ug" : n.unit}`;
  });
  const coverage = t && t.foods ? ` (estimates exist for ${t.microFoods} of ${t.foods} foods logged today)` : "";
  return `The user also tracks these nutrients. Today so far${coverage}:\n${rows.join("\n")}`;
}

export function coachSystemPrompt(lang: Lang, ctx: CoachContext): string {
  const dayLine = (d: Day) => {
    const t = totals(d);
    return `${d.date}: ${Math.round(t.kcal)} kcal eaten, ${Math.round(t.protein)} g protein, ${Math.round(t.burned)} kcal burned, water ${d.waterGlasses}×250 ml${d.weightKg ? `, weight ${d.weightKg} kg` : ""}`;
  };
  const todayDay = ctx.week[ctx.week.length - 1];
  const yesterday = ctx.week[ctx.week.length - 2];
  const entries = (d?: Day) =>
    d
      ? [
          ...d.food.map((f) => `- ${f.meal}: ${f.name} (${f.serving}${f.quantity !== 1 ? ` ×${f.quantity}` : ""}) ${Math.round(f.kcal * f.quantity)} kcal, P${Math.round(f.protein * f.quantity)} C${Math.round(f.carbs * f.quantity)} F${Math.round(f.fat * f.quantity)}`),
          ...d.exercise.map((e) => `- exercise: ${e.name}${e.minutes ? ` ${e.minutes} min` : ""} ${e.kcal} kcal`),
        ].join("\n") || "- nothing logged"
      : "- nothing logged";
  const weekday = parseKey(ctx.today).toLocaleDateString("en-US", { weekday: "long" });
  return [
    "You are a friendly, practical nutrition and fitness coach inside a calorie-tracking app. Keep replies short (2–5 sentences) and specific, using the user's numbers.",
    `Today is ${weekday}, ${ctx.today}. Write your reply in ${LANG_NAME[lang]}.`,
    `User: ${ctx.profile.sex}, ${ctx.profile.age} y, ${ctx.profile.heightCm} cm, ${ctx.profile.weightKg} kg, goal ${ctx.profile.goal}.`,
    `Daily targets: ${ctx.targets.kcal} kcal, protein ${ctx.targets.protein} g, carbs ${ctx.targets.carbs} g, fat ${ctx.targets.fat} g, water ${ctx.targets.water}×250 ml.`,
    `Today's log:\n${entries(todayDay)}`,
    `Yesterday's log:\n${entries(yesterday)}`,
    `Last 7 days:\n${ctx.week.map(dayLine).join("\n")}`,
    nutrientLines(ctx.profile, todayDay),
    ctx.favorites.length ? `Saved favorites: ${ctx.favorites.map((f) => `${f.name} (${f.kcal} kcal)`).join("; ")}` : "",
    "",
    "You can propose changes to the log. The user must tap to add them; you never add anything yourself, so never say you logged something.",
    "Reply ONLY with JSON in this shape:",
    `{"reply":"your message","actions":[{"type":"add_food","date":"${ctx.today}","meal":"dinner","items":[{"name":"Baked salmon","portion":"150 g","kcal":312,"protein":34,"carbs":0,"fat":19}]},{"type":"add_exercise","date":"${ctx.today}","items":[{"name":"Running","minutes":30,"kcal":350}]}]}`,
    ctx.profile.nutrients.length ? nutrientRule(ctx.profile.nutrients).replace("- Also estimate", "In add_food items, also include") : "",
    "Use actions only when the user asks you to log, plan or suggest specific food or exercise. Planning a future day = add_food actions with that date (one action per meal). Otherwise use an empty actions list.",
    "This is general wellness guidance, not medical advice; suggest a professional for medical questions.",
  ]
    .filter(Boolean)
    .join("\n");
}
