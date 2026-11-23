// Schedules the planned reminders with the phone's notification system and turns taps
// (and the buttons on a notification) into navigation inside the app.
// Local notifications only: nothing goes through a server. Not available in the web version.
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { TFn } from "../i18n";
import { MEALS, getDays, setWater, getDay, type Day } from "../store";
import { planReminders, withDefaults, type DayFacts, type PlannedReminder, type ReminderSettings, LOOKAHEAD_DAYS } from "./plan";

export * from "./plan";

export const remindersSupported = Platform.OS === "ios" || Platform.OS === "android";

const CHANNEL = "reminders";
const CAT_MEAL = "lmtg-meal";
const CAT_WATER = "lmtg-water";
export const ACTION_PHOTO = "photo";
export const ACTION_SAY = "say";
export const ACTION_WATER = "water-add";

if (remindersSupported) {
  // Show reminders even while the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export type Permission = "granted" | "denied" | "undetermined";

export async function getPermission(): Promise<Permission> {
  if (!remindersSupported) return "denied";
  const p = await Notifications.getPermissionsAsync();
  return p.granted ? "granted" : p.canAskAgain ? "undetermined" : "denied";
}
export async function askPermission(): Promise<Permission> {
  if (!remindersSupported) return "denied";
  await ensureChannel();
  const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return p.granted ? "granted" : p.canAskAgain ? "undetermined" : "denied";
}

async function ensureChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: "Reminders", importance: Notifications.AndroidImportance.DEFAULT });
  }
}

let categoriesLang = "";
async function ensureCategories(t: TFn, lang: string) {
  if (categoriesLang === lang) return;
  await Notifications.setNotificationCategoryAsync(CAT_MEAL, [
    { identifier: ACTION_PHOTO, buttonTitle: t("action.photo"), options: { opensAppToForeground: true } },
    { identifier: ACTION_SAY, buttonTitle: t("action.say"), options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(CAT_WATER, [
    { identifier: ACTION_WATER, buttonTitle: t("rem.waterAction"), options: { opensAppToForeground: true } },
  ]);
  categoriesLang = lang;
}

const factsOf = (d: Day): DayFacts => ({
  mealsLogged: MEALS.filter((m) => d.food.some((f) => f.meal === m)),
  waterGlasses: d.waterGlasses,
  weighedIn: d.weightKg != null,
});

function content(r: PlannedReminder, t: TFn, waterGoal: number): Notifications.NotificationContentInput {
  const data = { url: r.url, date: r.date, meal: r.meal ?? null, kind: r.kind };
  switch (r.kind) {
    case "meal":
      return { title: t(`rem.meal.${r.meal ?? "lunch"}`), body: t("rem.mealBody"), data, categoryIdentifier: CAT_MEAL };
    case "water":
      return { title: t("rem.waterTitle"), body: t("rem.waterBody", { goal: (waterGoal * 0.25).toFixed(1).replace(/\.0$/, "") }), data, categoryIdentifier: CAT_WATER };
    case "evening":
      return { title: t("rem.eveningTitle"), body: t("rem.eveningBody"), data };
    case "weighIn":
      return { title: t("rem.weighTitle"), body: t("rem.weighBody"), data };
  }
}

let running: Promise<number> | null = null;
let again = false;

/** Re-plans and re-schedules every reminder. Safe to call often; calls are coalesced. Returns how many are scheduled. */
export function syncReminders(raw: Partial<ReminderSettings> | null | undefined, t: TFn, lang: string, waterGoal: number): Promise<number> {
  if (!remindersSupported) return Promise.resolve(0);
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    let n = 0;
    try {
      do {
        again = false;
        n = await syncOnce(withDefaults(raw), t, lang, waterGoal);
      } while (again);
    } finally {
      running = null;
    }
    return n;
  })();
  return running;
}

async function syncOnce(settings: ReminderSettings, t: TFn, lang: string, waterGoal: number): Promise<number> {
  // Cancel only our own reminders.
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(existing.filter((x) => x.identifier.startsWith("lmtg-")).map((x) => Notifications.cancelScheduledNotificationAsync(x.identifier)));
  if (!settings.enabled || (await getPermission()) !== "granted") return 0;
  await ensureChannel();
  await ensureCategories(t, lang);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + LOOKAHEAD_DAYS - 1);
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const days = new Map((await getDays(key(start), key(end))).map((d) => [d.date, factsOf(d)]));
  const plan = planReminders(settings, now, (date) => days.get(date) ?? { mealsLogged: [], waterGlasses: 0, weighedIn: false }, waterGoal);
  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: content(r, t, waterGoal),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
    });
  }
  return plan.length;
}

/** Sends one test reminder in 5 seconds, so the user can see what they look like. */
export async function sendTest(t: TFn) {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: "lmtg-test",
    content: { title: t("rem.meal.lunch"), body: t("rem.mealBody"), data: { url: "/photo?meal=lunch", kind: "meal", meal: "lunch" }, categoryIdentifier: CAT_MEAL },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL },
  });
}

/** Where a tapped notification (or one of its buttons) should take the user. Adds a glass first for "+1 glass". */
export async function routeForResponse(res: Notifications.NotificationResponse): Promise<string | null> {
  const data = (res.notification.request.content.data ?? {}) as { url?: string; date?: string; meal?: string | null };
  const meal = data.meal ? `meal=${data.meal}` : "";
  const date = data.date ? `date=${data.date}` : "";
  const q = [meal, date].filter(Boolean).join("&");
  switch (res.actionIdentifier) {
    case ACTION_PHOTO:
      return `/photo${q ? `?${q}` : ""}`;
    case ACTION_SAY:
      return `/say${q ? `?${q}` : ""}`;
    case ACTION_WATER: {
      const d = data.date ?? key(new Date());
      const day = await getDay(d);
      await setWater(d, day.waterGlasses + 1);
      return "/";
    }
    default:
      return typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/";
  }
}
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const lastResponse = () => (remindersSupported ? Notifications.getLastNotificationResponse() : null);
export const clearLastResponse = () => remindersSupported && Notifications.clearLastNotificationResponse();
export const onResponse = (fn: (r: Notifications.NotificationResponse) => void) =>
  remindersSupported ? Notifications.addNotificationResponseReceivedListener(fn) : { remove() {} };
