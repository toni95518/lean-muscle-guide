// On-device storage. Everything the user logs lives on the phone (AsyncStorage);
// an account is optional and only used for backup (see lib/account.ts).
// Each day is one record, so reading a week touches 7 small records.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isDateKey, range, today } from "./dates";
import { DEFAULT_PROFILE, type Profile } from "./nutrition";

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";
export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
export type Source = "library" | "favorite" | "quick" | "ai" | "manual" | "coach";

export interface FoodEntry {
  id: string;
  name: string;
  serving: string;
  kcal: number; // per serving; totals = value × quantity
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  meal: Meal;
  source: Source;
  libraryName?: string; // set when it came from the built-in library (translated for display)
  createdAt: number;
}
export interface ExerciseEntry {
  id: string;
  name: string;
  minutes: number; // 0 = not recorded
  kcal: number;
  note?: string;
  source: Source;
  activityName?: string;
  createdAt: number;
}
export interface Day {
  date: string;
  food: FoodEntry[];
  exercise: ExerciseEntry[];
  waterGlasses: number;
  weightKg: number | null;
}
export interface Favorite {
  id: string;
  name: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  libraryName?: string;
}
export type Lang = "en" | "zh" | "fr" | "de";
export type ProviderId = "anthropic" | "openai" | "gemini" | "deepseek" | "qwen" | "doubao" | "openrouter" | "custom";
export interface AiConfig {
  provider: ProviderId;
  baseUrl: string;
  model: string;
}
export interface Account {
  serverUrl: string;
  email: string;
  lastBackupAt: string | null;
}
export interface Settings {
  onboarded: boolean;
  language: Lang | null; // null = follow the phone
  ai: AiConfig | null; // the key itself is in secure storage (lib/secrets.ts)
  account: Account | null;
}
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: CoachAction[];
  doneActions?: number[]; // indexes of actions the user added
  at: number;
}
export type CoachAction =
  | { type: "add_food"; date: string; meal: Meal; items: NewFood[] }
  | { type: "add_exercise"; date: string; items: NewExercise[] };
export type NewFood = Omit<FoodEntry, "id" | "createdAt" | "meal" | "source"> & { meal?: Meal };
export type NewExercise = Omit<ExerciseEntry, "id" | "createdAt" | "source">;

export const DEFAULT_SETTINGS: Settings = { onboarded: false, language: null, ai: null, account: null };

const K = {
  profile: "lmtg:profile",
  settings: "lmtg:settings",
  favorites: "lmtg:favorites",
  dates: "lmtg:dates",
  coach: "lmtg:coach",
  day: (d: string) => `lmtg:day:${d}`,
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-5);
const emptyDay = (date: string): Day => ({ date, food: [], exercise: [], waterGlasses: 0, weightKg: null });

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
const setJSON = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v));

// ---------- profile, settings, favorites ----------
export const loadProfile = async () => ({ ...DEFAULT_PROFILE, ...(await getJSON<Partial<Profile>>(K.profile, {})) });
export const saveProfile = (p: Profile) => setJSON(K.profile, p);
export const loadSettings = async () => ({ ...DEFAULT_SETTINGS, ...(await getJSON<Partial<Settings>>(K.settings, {})) });
export const saveSettings = (s: Settings) => setJSON(K.settings, s);
export const loadFavorites = () => getJSON<Favorite[]>(K.favorites, []);
export const saveFavorites = (f: Favorite[]) => setJSON(K.favorites, f);
export const loadCoach = () => getJSON<ChatMessage[]>(K.coach, []);
export const saveCoach = (m: ChatMessage[]) => setJSON(K.coach, m.slice(-60));

// ---------- days ----------
const dayCache = new Map<string, Day>();
let datesCache: Set<string> | null = null;

async function dateIndex(): Promise<Set<string>> {
  if (!datesCache) datesCache = new Set(await getJSON<string[]>(K.dates, []));
  return datesCache;
}

export async function getDay(date: string): Promise<Day> {
  const hit = dayCache.get(date);
  if (hit) return hit;
  const d = { ...emptyDay(date), ...(await getJSON<Partial<Day>>(K.day(date), {})), date };
  dayCache.set(date, d);
  return d;
}

async function putDay(day: Day) {
  dayCache.set(day.date, day);
  const idx = await dateIndex();
  const hasData = day.food.length || day.exercise.length || day.waterGlasses || day.weightKg != null;
  if (hasData) {
    await setJSON(K.day(day.date), day);
    if (!idx.has(day.date)) {
      idx.add(day.date);
      await setJSON(K.dates, [...idx].sort());
    }
  } else {
    await AsyncStorage.removeItem(K.day(day.date));
    if (idx.delete(day.date)) await setJSON(K.dates, [...idx].sort());
  }
}

async function mutate(date: string, fn: (d: Day) => Day): Promise<Day> {
  const next = fn(structuredClone(await getDay(date)));
  await putDay(next);
  return next;
}

export async function getDays(from: string, to: string): Promise<Day[]> {
  return Promise.all(range(from, to).map(getDay));
}
export async function datesWithData(): Promise<string[]> {
  return [...(await dateIndex())].sort();
}

export function addFoods(date: string, meal: Meal, source: Source, items: NewFood[]) {
  const now = Date.now();
  return mutate(date, (d) => ({
    ...d,
    food: [
      ...d.food,
      ...items.map((it, i) => ({
        ...it,
        id: uid(),
        meal: it.meal ?? meal,
        source,
        quantity: it.quantity || 1,
        createdAt: now + i,
      })),
    ],
  }));
}
export const removeFood = (date: string, id: string) => mutate(date, (d) => ({ ...d, food: d.food.filter((f) => f.id !== id) }));
export const restoreFood = (date: string, entry: FoodEntry) => mutate(date, (d) => ({ ...d, food: [...d.food, entry].sort((a, b) => a.createdAt - b.createdAt) }));

export function addExercises(date: string, source: Source, items: NewExercise[]) {
  const now = Date.now();
  return mutate(date, (d) => ({
    ...d,
    exercise: [...d.exercise, ...items.map((it, i) => ({ ...it, id: uid(), source, createdAt: now + i }))],
  }));
}
export const removeExercise = (date: string, id: string) => mutate(date, (d) => ({ ...d, exercise: d.exercise.filter((e) => e.id !== id) }));
export const restoreExercise = (date: string, entry: ExerciseEntry) => mutate(date, (d) => ({ ...d, exercise: [...d.exercise, entry].sort((a, b) => a.createdAt - b.createdAt) }));

export const setWater = (date: string, glasses: number) => mutate(date, (d) => ({ ...d, waterGlasses: Math.max(0, Math.min(40, glasses)) }));

/** Saves a weigh-in. Returns the latest weigh-in overall, which becomes the profile weight. */
export async function setWeight(date: string, weightKg: number | null): Promise<number | null> {
  if (weightKg != null && date > today()) throw new Error("future_weight");
  await mutate(date, (d) => ({ ...d, weightKg }));
  const dates = (await datesWithData()).filter((k) => k <= today()).reverse();
  for (const k of dates) {
    const d = await getDay(k);
    if (d.weightKg != null) return d.weightKg;
  }
  return null;
}

// ---------- totals ----------
export interface Totals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  burned: number;
  minutes: number;
}
export function totals(d: Day): Totals {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, burned: 0, minutes: 0 };
  for (const f of d.food) {
    t.kcal += f.kcal * f.quantity;
    t.protein += f.protein * f.quantity;
    t.carbs += f.carbs * f.quantity;
    t.fat += f.fat * f.quantity;
  }
  for (const e of d.exercise) {
    t.burned += e.kcal;
    t.minutes += e.minutes;
  }
  return t;
}

/** Most recent distinct foods from the last 30 days, newest first. */
export async function recentFoods(limit = 12): Promise<FoodEntry[]> {
  const days = await getDays(shiftBack(30), today());
  const seen = new Set<string>();
  const out: FoodEntry[] = [];
  for (const d of days.reverse()) {
    for (const f of [...d.food].reverse()) {
      if (!seen.has(f.name)) {
        seen.add(f.name);
        out.push(f);
      }
    }
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}
function shiftBack(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- backup / restore ----------
export interface Snapshot {
  version: 1;
  exportedAt: string;
  profile: Profile;
  favorites: Favorite[];
  days: Day[];
  language: Lang | null;
}
export async function exportAll(): Promise<Snapshot> {
  const [profile, favorites, settings, dates] = await Promise.all([loadProfile(), loadFavorites(), loadSettings(), datesWithData()]);
  return { version: 1, exportedAt: new Date().toISOString(), profile, favorites, days: await Promise.all(dates.map(getDay)), language: settings.language };
}
export async function importAll(s: Snapshot) {
  if (!s || s.version !== 1 || !Array.isArray(s.days)) throw new Error("bad_backup");
  const old = await datesWithData();
  await AsyncStorage.multiRemove(old.map(K.day));
  dayCache.clear();
  const valid = s.days.filter((d) => isDateKey(d.date));
  await AsyncStorage.multiSet(valid.map((d) => [K.day(d.date), JSON.stringify(d)]));
  datesCache = new Set(valid.map((d) => d.date));
  await setJSON(K.dates, [...datesCache].sort());
  await saveProfile({ ...DEFAULT_PROFILE, ...s.profile });
  await saveFavorites(s.favorites ?? []);
}
export async function clearAll() {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith("lmtg:")));
  dayCache.clear();
  datesCache = null;
}
