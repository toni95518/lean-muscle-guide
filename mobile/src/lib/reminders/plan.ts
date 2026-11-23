// Pure planning logic for reminders (no Expo imports, so it can be tested in plain Node).
// The app schedules one-off reminders for the next few days and re-plans whenever it opens or
// the log changes, so a reminder disappears once that thing is logged, and reminders stop
// on their own after a week of not opening the app.

export type MealKey = "breakfast" | "lunch" | "dinner";
export interface TimeSetting {
  on: boolean;
  time: string; // "HH:MM", 24 h
}
export interface ReminderSettings {
  enabled: boolean;
  meals: Record<MealKey, TimeSetting>;
  water: { on: boolean; times: string[] };
  evening: TimeSetting;
  weighIn: TimeSetting & { weekday: number }; // 0 = Sunday … 6 = Saturday
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  meals: { breakfast: { on: true, time: "08:00" }, lunch: { on: true, time: "12:30" }, dinner: { on: true, time: "18:30" } },
  water: { on: false, times: ["10:30", "14:30", "17:30"] },
  evening: { on: false, time: "21:00" },
  weighIn: { on: false, time: "07:30", weekday: 1 },
};

/** Fills in fields a stored (older or partial) settings object is missing. */
export function withDefaults(r?: Partial<ReminderSettings> | null): ReminderSettings {
  const d = DEFAULT_REMINDERS;
  return {
    enabled: r?.enabled ?? d.enabled,
    meals: {
      breakfast: { ...d.meals.breakfast, ...r?.meals?.breakfast },
      lunch: { ...d.meals.lunch, ...r?.meals?.lunch },
      dinner: { ...d.meals.dinner, ...r?.meals?.dinner },
    },
    water: { ...d.water, ...r?.water },
    evening: { ...d.evening, ...r?.evening },
    weighIn: { ...d.weighIn, ...r?.weighIn },
  };
}

/** What the planner needs to know about one day of the log. */
export interface DayFacts {
  mealsLogged: string[]; // meals that already have food
  waterGlasses: number;
  weighedIn: boolean;
}

export type ReminderKind = "meal" | "water" | "evening" | "weighIn";
export interface PlannedReminder {
  id: string; // stable, so re-planning replaces instead of duplicating
  kind: ReminderKind;
  at: Date;
  date: string; // YYYY-MM-DD the reminder is about
  meal?: MealKey;
  url: string; // where tapping it opens the app
}

export const LOOKAHEAD_DAYS = 8; // 8 so next week's weekly weigh-in is always planned
export const MAX_SCHEDULED = 60; // iOS keeps at most 64 pending local notifications

export const parseTime = (s: string): [number, number] | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  return h < 24 && min < 60 ? [h, min] : null;
};
/** Moves a "HH:MM" time by some minutes, wrapping around midnight. */
export const shiftTime = (s: string, minutes: number): string => {
  const t = parseTime(s) ?? [8, 0];
  const total = (((t[0] * 60 + t[1] + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const at = (day: Date, time: string): Date | null => {
  const t = parseTime(time);
  if (!t) return null;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), t[0], t[1], 0, 0);
};

export function planReminders(
  settings: ReminderSettings,
  now: Date,
  facts: (date: string) => DayFacts,
  waterGoal: number,
): PlannedReminder[] {
  if (!settings.enabled) return [];
  const out: PlannedReminder[] = [];
  for (let i = 0; i < LOOKAHEAD_DAYS; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const date = keyOf(day);
    const f = facts(date);
    const push = (r: Omit<PlannedReminder, "date">) => {
      if (r.at.getTime() > now.getTime() + 30_000) out.push({ ...r, date });
    };
    for (const meal of ["breakfast", "lunch", "dinner"] as MealKey[]) {
      const s = settings.meals[meal];
      const when = s.on ? at(day, s.time) : null;
      if (when && !f.mealsLogged.includes(meal)) push({ id: `lmtg-meal-${meal}-${date}`, kind: "meal", at: when, meal, url: `/photo?meal=${meal}&date=${date}` });
    }
    if (settings.water.on && f.waterGlasses < waterGoal) {
      settings.water.times.forEach((time, n) => {
        const when = at(day, time);
        if (when) push({ id: `lmtg-water-${n}-${date}`, kind: "water", at: when, url: "/" });
      });
    }
    if (settings.evening.on) {
      const when = at(day, settings.evening.time);
      if (when) push({ id: `lmtg-evening-${date}`, kind: "evening", at: when, url: "/" });
    }
    if (settings.weighIn.on && day.getDay() === settings.weighIn.weekday && !f.weighedIn) {
      const when = at(day, settings.weighIn.time);
      if (when) push({ id: `lmtg-weigh-${date}`, kind: "weighIn", at: when, url: "/" });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_SCHEDULED);
}
