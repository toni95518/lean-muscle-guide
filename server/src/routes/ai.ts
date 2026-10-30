import { Router } from "express";
import { z } from "zod";
import { AiParseError, foodPrompt, parseAiFoodReply } from "../lib/aiFood";
import { HttpError } from "../lib/errors";

export const aiRouter = Router();

// GET /api/ai/food-prompt?lang=zh&meal=lunch → the prompt to paste into the user's own AI
aiRouter.get("/ai/food-prompt", (req, res) => {
  const { lang, meal } = z
    .object({
      lang: z.enum(["en", "zh", "fr", "de"]).default("en"),
      meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
    })
    .parse(req.query);
  res.json({ lang, prompt: foodPrompt(lang, meal) });
});

// POST /api/ai/parse-food { text } → { items, notes, totals }
// Reads the AI's reply. Nothing is saved; the client shows the items for review,
// then logs them with POST /api/days/:date/food/batch.
aiRouter.post("/ai/parse-food", (req, res) => {
  const { text } = z.object({ text: z.string().min(1).max(20_000) }).parse(req.body);
  try {
    res.json(parseAiFoodReply(text));
  } catch (e) {
    if (e instanceof AiParseError) throw new HttpError(422, "ai_reply_unreadable", e.message);
    throw e;
  }
});
