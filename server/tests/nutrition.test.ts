import { describe, expect, it } from "vitest";
import { bmr, caloriesBurned, dayTotals, fromKg, targets, toKg, type ProfileInput } from "../src/lib/nutrition";
import { addDays, dateRange, daysBetween, isoDate } from "../src/lib/dates";

const base: ProfileInput = {
  sex: "female",
  age: 30,
  heightCm: 168,
  weightKg: 68,
  activity: 1.375,
  goal: "maintain",
  calorieOverride: null,
  proteinPerKg: 1.6,
  waterGoal: 8,
};

describe("bmr (Mifflin–St Jeor)", () => {
  it("matches the published formula for women and men", () => {
    expect(bmr(base)).toBe(10 * 68 + 6.25 * 168 - 5 * 30 - 161); // 1419
    expect(bmr({ ...base, sex: "male" })).toBe(10 * 68 + 6.25 * 168 - 5 * 30 + 5); // 1585
  });
});

describe("targets", () => {
  it("computes maintenance calories and macro split", () => {
    const t = targets(base);
    expect(t.bmr).toBe(1419);
    expect(t.tdee).toBe(1951);
    expect(t.kcal).toBe(1950); // rounded to nearest 10
    expect(t.protein).toBe(109); // 1.6 g × 68 kg
    expect(t.fat).toBe(61); // 28% of kcal ÷ 9
    expect(t.carbs).toBe(241); // the remainder ÷ 4
    expect(t.water).toBe(8);
  });

  it("applies the goal adjustment", () => {
    expect(targets({ ...base, goal: "lose1" }).kcal).toBe(1450);
    expect(targets({ ...base, goal: "gain05" }).kcal).toBe(2200);
  });

  it("never goes below a safe floor", () => {
    const tiny = { ...base, weightKg: 40, heightCm: 145, age: 70, activity: 1.2, goal: "lose1" as const };
    expect(targets(tiny).kcal).toBe(1200);
    expect(targets({ ...tiny, sex: "male" }).kcal).toBe(1500);
  });

  it("uses a custom calorie target when set", () => {
    const t = targets({ ...base, calorieOverride: 2400 });
    expect(t.kcal).toBe(2400);
    expect(t.calculatedKcal).toBe(1950);
  });
});

describe("caloriesBurned", () => {
  it("uses MET × 3.5 × kg ÷ 200 × minutes", () => {
    expect(caloriesBurned(8, 70, 30)).toBe(294);
    expect(caloriesBurned(3.5, 68, 45)).toBe(187);
  });
});

describe("dayTotals", () => {
  it("multiplies by quantity and subtracts exercise", () => {
    const t = dayTotals(
      [
        { kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8, quantity: 2 },
        { kcal: 166, protein: 5.9, carbs: 28, fat: 3.6, quantity: 1 },
      ],
      [{ kcal: 300, minutes: 40 }],
    );
    expect(t).toEqual({ kcal: 310, protein: 18.5, carbs: 28.8, fat: 13.2, burned: 300, activeMinutes: 40, net: 10 });
  });
  it("handles an empty day", () => {
    expect(dayTotals([], []).kcal).toBe(0);
  });
});

describe("unit conversion", () => {
  it("converts lb and jin to kg and back", () => {
    expect(toKg(150, "lb")).toBeCloseTo(68.04, 2);
    expect(toKg(120, "jin")).toBe(60);
    expect(fromKg(60, "jin")).toBe(120);
    expect(fromKg(toKg(165.4, "lb"), "lb")).toBeCloseTo(165.4, 6);
  });
});

describe("dates", () => {
  it("validates calendar dates", () => {
    expect(isoDate.safeParse("2026-02-28").success).toBe(true);
    expect(isoDate.safeParse("2026-02-30").success).toBe(false);
    expect(isoDate.safeParse("10/21/2026").success).toBe(false);
  });
  it("does date math across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-10-15", "2026-10-21")).toBe(7);
    expect(dateRange("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });
});
