import { getLocales } from "expo-localization";
import { ACTIVITY_NAMES, FOOD_NAMES, SERVING_NAMES } from "../library";
import type { Lang } from "../store";
import { STRINGS, type StringKey } from "./strings";

export const LANGS: [Lang, string][] = [
  ["en", "English"],
  ["zh", "中文"],
  ["fr", "Français"],
  ["de", "Deutsch"],
];
export const LOCALE: Record<Lang, string> = { en: "en-US", zh: "zh-CN", fr: "fr-FR", de: "de-DE" };

export function deviceLang(): Lang {
  try {
    for (const l of getLocales()) {
      const c = (l.languageCode ?? "").toLowerCase();
      if (c === "en" || c === "zh" || c === "fr" || c === "de") return c;
    }
  } catch {
    /* fall through */
  }
  return "en";
}

export type TFn = (key: StringKey | `meal.${string}` | `me.${string}` | `review.conf.${string}`, vars?: Record<string, string | number>) => string;

/** t("key", {n: 2}) — a "_one" variant is used when n === 1. */
export function makeT(lang: Lang): TFn {
  const table = STRINGS[lang] as Record<string, string>;
  const en = STRINGS.en as Record<string, string>;
  return (key, vars) => {
    let s = (vars && vars.n === 1 && (table[key + "_one"] ?? en[key + "_one"])) || table[key] || en[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
    return s;
  };
}

const idx: Record<Lang, number> = { en: 0, zh: 1, fr: 2, de: 3 };
const lookup = (rows: [string, string, string, string][]) => {
  const map = new Map<string, [string, string, string, string]>();
  for (const r of rows) map.set(r[0], r);
  return (name: string, lang: Lang) => map.get(name)?.[idx[lang]] ?? name;
};
export const trFood = lookup(FOOD_NAMES);
export const trActivity = lookup(ACTIVITY_NAMES);
export const trServing = lookup(SERVING_NAMES);

export function makeFormat(lang: Lang) {
  const loc = LOCALE[lang];
  return {
    int: (n: number) => Math.round(n).toLocaleString(loc),
    dec: (n: number, digits = 1) => Number(n).toLocaleString(loc, { maximumFractionDigits: digits }),
    date: (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(loc, o),
  };
}
