import { describe, expect, it } from "vitest";
import { AiParseError, foodPrompt, parseAiFoodReply } from "../src/lib/aiFood";

describe("foodPrompt", () => {
  it("writes the prompt in the user's language and names the meal", () => {
    expect(foodPrompt("en", "lunch")).toContain("my lunch");
    expect(foodPrompt("zh", "dinner")).toContain("晚餐");
    expect(foodPrompt("zh")).toContain('"kcal"');
  });
});

describe("parseAiFoodReply", () => {
  it("reads the format the prompt asks for, inside a code fence with chatter around it", () => {
    const reply = `Here's my estimate!
\`\`\`json
{"items":[
  {"name":"Grilled chicken breast","portion":"about 150 g","kcal":248,"protein":46,"carbs":0,"fat":5},
  {"name":"White rice","portion":"1 cup","kcal":205,"protein":4.3,"carbs":45,"fat":0.4}
],"notes":"Assumed no oil on the chicken."}
\`\`\`
Enjoy your meal.`;
    const r = parseAiFoodReply(reply);
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toEqual({ name: "Grilled chicken breast", serving: "about 150 g", kcal: 248, protein: 46, carbs: 0, fat: 5 });
    expect(r.totals).toEqual({ kcal: 453, protein: 50.3, carbs: 45, fat: 5.4 });
    expect(r.notes).toBe("Assumed no oil on the chicken.");
  });

  it("accepts Chinese keys, unit strings, and a bare array", () => {
    const r = parseAiFoodReply('[{"食物":"牛肉面","份量":"一碗","热量":"约520千卡","蛋白质":"30g","碳水":"60克","脂肪":16}]');
    expect(r.items[0]).toMatchObject({ name: "牛肉面", serving: "一碗", kcal: 520, protein: 30, carbs: 60, fat: 16 });
  });

  it("accepts common English variants like calories and protein_g", () => {
    const r = parseAiFoodReply('{"foods":[{"food":"Latte","serving":"12 oz","calories":"150 kcal","protein_g":10,"carbohydrates":15,"fat_g":6}]}');
    expect(r.items[0]).toMatchObject({ name: "Latte", kcal: 150, protein: 10, carbs: 15, fat: 6 });
  });

  it("handles smart quotes and braces inside strings", () => {
    const r = parseAiFoodReply('{“items”:[{“name”:“Salad {house}”,“kcal”:180}]}');
    expect(r.items[0]).toMatchObject({ name: "Salad {house}", kcal: 180, protein: 0 });
  });

  it("skips items without a name or with impossible calories", () => {
    const r = parseAiFoodReply('{"items":[{"name":"Apple","kcal":95},{"kcal":100},{"name":"Typo","kcal":99999}]}');
    expect(r.items.map((i) => i.name)).toEqual(["Apple"]);
  });

  it("explains what went wrong when the reply can't be used", () => {
    expect(() => parseAiFoodReply("It looks like a sandwich, maybe 400 calories.")).toThrow(AiParseError);
    expect(() => parseAiFoodReply('{"items": [}')).toThrow(/valid JSON/);
    expect(() => parseAiFoodReply('{"items":[]}')).toThrow(/didn't include any foods/);
  });
});
