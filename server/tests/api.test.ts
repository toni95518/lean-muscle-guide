import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { pool } from "../src/db";

const app = createApp();
const api = () => request(app);
let n = 0;
const uniqueEmail = () => `user${Date.now()}${n++}@example.com`;

async function signUp() {
  const res = await api().post("/api/auth/register").send({ email: uniqueEmail(), password: "correct horse" });
  expect(res.status).toBe(201);
  return { token: res.body.token as string, auth: { Authorization: `Bearer ${res.body.token}` }, body: res.body };
}

afterAll(() => pool.end());

describe("auth", () => {
  it("registers, rejects duplicates, and logs in", async () => {
    const email = uniqueEmail();
    const reg = await api().post("/api/auth/register").send({ email: email.toUpperCase(), password: "longpassword" });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe(email); // normalized to lowercase
    expect(reg.body.profile.weightUnit).toBe("lb");
    expect(reg.body.targets.kcal).toBe(1950);
    expect(reg.body.user).not.toHaveProperty("passwordHash");

    const dup = await api().post("/api/auth/register").send({ email, password: "longpassword" });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("email_taken");

    const bad = await api().post("/api/auth/login").send({ email, password: "wrongpassword" });
    expect(bad.status).toBe(401);

    const ok = await api().post("/api/auth/login").send({ email, password: "longpassword" });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
  });

  it("validates input with a clear error", async () => {
    const res = await api().post("/api/auth/register").send({ email: "nope", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_failed");
    expect(res.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual(["email", "password"]);
  });

  it("requires a valid token", async () => {
    expect((await api().get("/api/me")).status).toBe(401);
    expect((await api().get("/api/me").set("Authorization", "Bearer forged.token.here")).status).toBe(401);
  });

  it("reports WeChat login as not configured without credentials", async () => {
    const res = await api().post("/api/auth/wechat").send({ code: "abc" });
    expect(res.status).toBe(501);
  });
});

describe("profile and targets", () => {
  it("updates the profile and recalculates targets", async () => {
    const { auth } = await signUp();
    const res = await api()
      .patch("/api/profile")
      .set(auth)
      .send({ sex: "male", age: 25, heightCm: 180, weightKg: 80, activity: 1.55, goal: "lose05", weightUnit: "kg", setupComplete: true });
    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({ sex: "male", weightKg: 80, weightUnit: "kg", setupComplete: true });
    // BMR 1805 × 1.55 = 2797.75 − 250 → 2550
    expect(res.body.targets.kcal).toBe(2550);
    expect(res.body.targets.protein).toBe(128);

    const bad = await api().patch("/api/profile").set(auth).send({ age: 5, favoriteColor: "blue" });
    expect(bad.status).toBe(400);
  });
});

describe("logging a day", () => {
  let auth: { Authorization: string };
  const day = "2026-10-21";

  beforeAll(async () => {
    ({ auth } = await signUp());
  });

  it("logs a library food with quantity", async () => {
    const lib = await api().get("/api/foods?q=egg, large").set(auth);
    expect(lib.status).toBe(200);
    const egg = lib.body.library.find((f: { name: string }) => f.name === "Egg, large");
    expect(egg).toBeTruthy();

    const res = await api().post(`/api/days/${day}/food`).set(auth).send({ meal: "breakfast", foodId: egg.id, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Egg, large", kcal: 72, quantity: 2, source: "library", date: day });
  });

  it("logs a custom food and saves it for reuse", async () => {
    const res = await api()
      .post(`/api/days/${day}/food`)
      .set(auth)
      .send({ meal: "dinner", name: "Mom's lasagna", serving: "1 plate", kcal: 610, protein: 32, carbs: 55, fat: 28, saveAsCustom: true });
    expect(res.status).toBe(201);
    expect(res.body.source).toBe("custom");
    expect(res.body.customFoodId).toBeTruthy();

    const search = await api().get("/api/foods?q=lasagna").set(auth);
    expect(search.body.custom).toHaveLength(1);
    expect(search.body.recent[0].name).toBe("Mom's lasagna");
  });

  it("estimates exercise calories from MET and body weight", async () => {
    const acts = await api().get("/api/activities?q=Running, 6 mph").set(auth);
    const run = acts.body.activities[0];
    expect(run.met).toBe(9.8);

    const res = await api().post(`/api/days/${day}/exercise`).set(auth).send({ activityId: run.id, minutes: 30, note: "3.1 mi" });
    expect(res.status).toBe(201);
    // 9.8 × 3.5 × 68 ÷ 200 × 30 = 349.86
    expect(res.body.kcal).toBe(350);

    const patched = await api().patch(`/api/exercise/${res.body.id}`).set(auth).send({ minutes: 60 });
    expect(patched.body.kcal).toBe(700);
  });

  it("records water and weight, and weight updates the profile", async () => {
    expect((await api().put(`/api/days/${day}/water`).set(auth).send({ glasses: 6 })).body.waterGlasses).toBe(6);
    const w = await api().put(`/api/days/${day}/weight`).set(auth).send({ weightKg: 67.5 });
    expect(w.status).toBe(200);
    expect(w.body.profileUpdated).toBe(true);
    expect((await api().get("/api/profile").set(auth)).body.profile.weightKg).toBe(67.5);

    // An older weigh-in doesn't replace the current weight
    const old = await api().put(`/api/days/2026-10-01/weight`).set(auth).send({ weightKg: 70 });
    expect(old.body.profileUpdated).toBe(false);
    expect((await api().get("/api/profile").set(auth)).body.profile.weightKg).toBe(67.5);
  });

  it("returns the full day with totals", async () => {
    const res = await api().get(`/api/days/${day}`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.food).toHaveLength(2);
    expect(res.body.exercise).toHaveLength(1);
    expect(res.body.waterGlasses).toBe(6);
    expect(res.body.weightKg).toBe(67.5);
    expect(res.body.totals).toMatchObject({ kcal: 144 + 610, burned: 700, net: 754 - 700 });
  });

  it("returns an empty day for a date with no data", async () => {
    const res = await api().get("/api/days/2026-01-01").set(auth);
    expect(res.body).toMatchObject({ date: "2026-01-01", food: [], exercise: [], waterGlasses: 0, weightKg: null });
  });

  it("lists a range of days", async () => {
    const res = await api().get("/api/days?from=2026-09-01&to=2026-10-31").set(auth);
    expect(res.body.days.map((d: { date: string }) => d.date)).toEqual(["2026-10-01", "2026-10-21"]);
    expect((await api().get("/api/days?from=2026-10-31&to=2026-10-01").set(auth)).status).toBe(400);
    expect((await api().get("/api/days?from=2020-01-01&to=2026-10-01").set(auth)).status).toBe(400);
  });

  it("rejects invalid dates", async () => {
    const res = await api().get("/api/days/2026-02-30").set(auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_date");
  });

  it("edits and deletes entries", async () => {
    const d = await api().get(`/api/days/${day}`).set(auth);
    const egg = d.body.food.find((f: { name: string }) => f.name === "Egg, large");
    const edit = await api().patch(`/api/food/${egg.id}`).set(auth).send({ quantity: 3, meal: "lunch" });
    expect(edit.body).toMatchObject({ quantity: 3, meal: "lunch" });
    expect((await api().delete(`/api/food/${egg.id}`).set(auth)).status).toBe(204);
    expect((await api().delete(`/api/food/${egg.id}`).set(auth)).status).toBe(404);
    expect((await api().delete(`/api/food/not-a-uuid`).set(auth)).status).toBe(404);
  });
});

describe("privacy between users", () => {
  it("never exposes or modifies another user's entries", async () => {
    const a = await signUp();
    const b = await signUp();
    const entry = await api().post("/api/days/2026-10-21/food").set(a.auth).send({ meal: "snack", name: "Apple slices", kcal: 50 });

    expect((await api().get("/api/days/2026-10-21").set(b.auth)).body.food).toHaveLength(0);
    expect((await api().patch(`/api/food/${entry.body.id}`).set(b.auth).send({ quantity: 9 })).status).toBe(404);
    expect((await api().delete(`/api/food/${entry.body.id}`).set(b.auth)).status).toBe(404);
    expect((await api().get("/api/foods?q=apple slices").set(b.auth)).body.recent).toHaveLength(0);
    expect((await api().get("/api/days/2026-10-21").set(a.auth)).body.food).toHaveLength(1);
  });
});

describe("summary", () => {
  it("summarizes a week and counts the logging streak", async () => {
    const { auth } = await signUp();
    for (const [date, kcal] of [["2026-10-17", 1800], ["2026-10-18", 2000], ["2026-10-19", 2200], ["2026-10-20", 2000]] as const) {
      await api().post(`/api/days/${date}/food`).set(auth).send({ meal: "lunch", name: "Meal", kcal, protein: 100 });
    }
    await api().post("/api/days/2026-10-15/food").set(auth).send({ meal: "lunch", name: "Meal", kcal: 1000 });
    await api().post("/api/days/2026-10-20/exercise").set(auth).send({ name: "Climbing", minutes: 60, kcal: 500 });
    await api().put("/api/days/2026-10-18/weight").set(auth).send({ weightKg: 70 });
    await api().put("/api/days/2026-10-20/weight").set(auth).send({ weightKg: 69.4 });

    // Today (10-21) has nothing logged yet; the streak still counts back from yesterday.
    const res = await api().get("/api/summary?to=2026-10-21&days=7").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.days).toHaveLength(7);
    expect(res.body.from).toBe("2026-10-15");
    expect(res.body.loggedDays).toBe(5);
    expect(res.body.averages.kcal).toBe(1800); // (1000+1800+2000+2200+2000)/5
    expect(res.body.totals).toMatchObject({ workouts: 1, activeMinutes: 60, burned: 500 });
    expect(res.body.streak).toBe(4); // 10-17 → 10-20; 10-16 is empty
    expect(res.body.weight.series).toEqual([
      { date: "2026-10-18", weightKg: 70 },
      { date: "2026-10-20", weightKg: 69.4 },
    ]);
    expect(res.body.weight.changeKg).toBe(-0.6);
  });
});

describe("quick add and AI-assisted logging", () => {
  it("logs calories in and out directly", async () => {
    const { auth } = await signUp();
    const food = await api().post("/api/days/2026-10-23/food").set(auth).send({ meal: "snack", name: "Quick add", kcal: 350, source: "quick" });
    expect(food.status).toBe(201);
    expect(food.body).toMatchObject({ source: "quick", kcal: 350, protein: 0 });

    // Calories burned without minutes (e.g. a number from a watch)
    const ex = await api().post("/api/days/2026-10-23/exercise").set(auth).send({ name: "Watch workout", kcal: 420, source: "quick" });
    expect(ex.status).toBe(201);
    expect(ex.body).toMatchObject({ minutes: 0, kcal: 420, source: "quick" });

    // Estimating from an activity still needs minutes
    const acts = await api().get("/api/activities?q=Yoga").set(auth);
    const bad = await api().post("/api/days/2026-10-23/exercise").set(auth).send({ activityId: acts.body.activities[0].id });
    expect(bad.status).toBe(400);

    const day = await api().get("/api/days/2026-10-23").set(auth);
    expect(day.body.totals).toMatchObject({ kcal: 350, burned: 420, net: -70 });
  });

  it("serves the prompt, reads the AI reply, and logs every item at once", async () => {
    const { auth } = await signUp();
    const prompt = await api().get("/api/ai/food-prompt?lang=zh&meal=lunch").set(auth);
    expect(prompt.body.prompt).toContain("午餐");

    const reply = '好的！```json\n{"items":[{"name":"米饭","portion":"一碗","kcal":230,"protein":4,"carbs":50,"fat":0},{"name":"番茄炒蛋","portion":"一份","kcal":260,"protein":14,"carbs":10,"fat":18}],"notes":"按家常做法估算"}\n```';
    const parsed = await api().post("/api/ai/parse-food").set(auth).send({ text: reply });
    expect(parsed.status).toBe(200);
    expect(parsed.body.totals.kcal).toBe(490);

    const saved = await api()
      .post("/api/days/2026-10-23/food/batch")
      .set(auth)
      .send({ meal: "lunch", source: "ai", items: parsed.body.items });
    expect(saved.status).toBe(201);
    expect(saved.body.entries).toHaveLength(2);
    expect(saved.body.entries.every((e: { source: string }) => e.source === "ai")).toBe(true);
    expect((await api().get("/api/days/2026-10-23").set(auth)).body.totals.kcal).toBe(490);

    const unreadable = await api().post("/api/ai/parse-food").set(auth).send({ text: "Looks like about 500 calories." });
    expect(unreadable.status).toBe(422);
    expect(unreadable.body.error.code).toBe("ai_reply_unreadable");
  });
});

describe("account", () => {
  it("deletes the account and all its data", async () => {
    const { auth } = await signUp();
    await api().post("/api/days/2026-10-21/food").set(auth).send({ meal: "snack", name: "Tea", kcal: 2 });
    expect((await api().delete("/api/me").set(auth)).status).toBe(204);
    expect((await api().get("/api/me").set(auth)).status).toBe(404);
  });

  it("stores push tokens for reminders", async () => {
    const { auth } = await signUp();
    expect((await api().post("/api/push-tokens").set(auth).send({ platform: "ios", token: "ExponentPushToken[abc123]" })).status).toBe(204);
  });
});
