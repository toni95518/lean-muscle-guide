// Reminder planner rules. Run: npm test (Node 22+, no extra packages).
import assert from "node:assert/strict";
import { planReminders, withDefaults, shiftTime, MAX_SCHEDULED } from "../src/lib/reminders/plan.ts";
const none = () => ({ mealsLogged: [], waterGlasses: 0, weighedIn: false });
const now = new Date(2026, 10, 23, 11, 0); // Mon Nov 23 2026, 11:00
const s = withDefaults({ enabled: true });
let p = planReminders(s, now, none, 8);
assert.ok(p.every((r) => r.at > now), "nothing in the past");
assert.equal(p[0].id, "lmtg-meal-lunch-2026-11-23", "first is today's lunch (breakfast 8:00 already passed)");
assert.equal(p.filter((r) => r.kind === "meal").length, 2 + 7 * 3, "3 meals x 8 days minus today's breakfast");
assert.equal(p[0].url, "/photo?meal=lunch&date=2026-11-23");
// lunch logged today -> skipped
p = planReminders(s, now, (d) => (d === "2026-11-23" ? { ...none(), mealsLogged: ["lunch"] } : none()), 8);
assert.ok(!p.some((r) => r.id === "lmtg-meal-lunch-2026-11-23"), "logged lunch is skipped");
assert.ok(p.some((r) => r.id === "lmtg-meal-dinner-2026-11-23"), "dinner still there");
// everything on
const all = withDefaults({ enabled: true, water: { on: true, times: ["10:30", "14:30", "17:30"] }, evening: { on: true, time: "21:00" }, weighIn: { on: true, time: "07:30", weekday: 1 } });
p = planReminders(all, now, none, 8);
assert.ok(p.length <= MAX_SCHEDULED, "under the iOS cap");
assert.equal(p.filter((r) => r.kind === "weighIn").length, 1, "one weigh-in: next Monday (today's 7:30 passed)");
assert.equal(p.find((r) => r.kind === "weighIn").date, "2026-11-30");
// water goal reached today -> no water today
p = planReminders(all, now, (d) => (d === "2026-11-23" ? { ...none(), waterGlasses: 8 } : none()), 8);
assert.ok(!p.some((r) => r.kind === "water" && r.date === "2026-11-23"), "water skipped once goal met");
assert.ok(p.some((r) => r.kind === "water" && r.date === "2026-11-24"), "water tomorrow still on");
// disabled
assert.equal(planReminders(withDefaults({ enabled: false }), now, none, 8).length, 0);
// partial old settings fill in
assert.equal(withDefaults({ enabled: true, meals: { lunch: { on: false } } }).meals.lunch.time, "12:30");
assert.equal(shiftTime("23:50", 15), "00:05");
assert.equal(shiftTime("00:00", -15), "23:45");
console.log("planner: all checks passed;", planReminders(all, now, none, 8).length, "reminders with everything on");
