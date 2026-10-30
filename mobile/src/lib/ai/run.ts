import type { TFn } from "../i18n";
import type { NutrientId } from "../nutrients";
import type { AiConfig, ChatMessage, Lang, Meal } from "../store";
import { getSecret, SECRET } from "../secrets";
import { AiError, complete } from "./client";
import { parseCoachReply, parseLogReply, ParseError, type ParsedLog } from "./parse";
import { coachSystemPrompt, logSystemPrompt, logUserPrompt, type CoachContext } from "./prompts";

/** Shows the AI's raw reply in the Expo terminal, to see why it couldn't be read. */
function logUnreadable(reply: string) {
  console.warn(`AI reply could not be read (${reply.length} chars). Start:\n${reply.slice(0, 600)}\n…End:\n${reply.slice(-300)}`);
}

async function keyOrThrow() {
  const key = await getSecret(SECRET.aiKey);
  if (!key) throw new AiError("no_key", "no_key");
  return key;
}

/** Photo and/or words → foods and exercises to review. */
export async function analyzeLog(cfg: AiConfig, lang: Lang, weightKg: number, input: { meal: Meal; note?: string; text?: string; photoBase64?: string; nutrients?: NutrientId[] }): Promise<ParsedLog> {
  const key = await keyOrThrow();
  const reply = await complete(cfg, key, {
    system: logSystemPrompt(lang, weightKg, input.nutrients),
    messages: [{ role: "user", text: logUserPrompt({ meal: input.meal, note: input.note, text: input.text, hasPhoto: !!input.photoBase64 }), imageBase64: input.photoBase64 }],
    maxTokens: 1500,
  });
  try {
    return parseLogReply(reply);
  } catch (e) {
    logUnreadable(reply);
    throw e;
  }
}

/** One coach turn, with the recent conversation for context. */
export async function coachTurn(cfg: AiConfig, lang: Lang, ctx: CoachContext, history: ChatMessage[], message: string) {
  const key = await keyOrThrow();
  const recent = history.slice(-10).map((m) => ({ role: m.role, text: m.text }));
  const reply = await complete(cfg, key, {
    system: coachSystemPrompt(lang, ctx),
    messages: [...recent, { role: "user" as const, text: message }],
    maxTokens: 1200,
  });
  try {
    return parseCoachReply(reply, ctx.today);
  } catch (e) {
    logUnreadable(reply);
    throw e;
  }
}

export function aiErrorText(e: unknown, t: TFn): string {
  if (e instanceof ParseError) return t(e.message === "empty" ? "ai.err.nothing" : "ai.err.unreadable");
  if (e instanceof AiError) {
    const key = ({ no_key: "ai.err.noKey", auth: "ai.err.auth", quota: "ai.err.quota", network: "ai.err.network", no_image: "ai.err.noImage", bad_model: "ai.err.model", empty: "ai.err.unreadable", other: "ai.err.other" } as const)[e.code];
    return e.code === "other" ? `${t(key)} (${e.message.slice(0, 120)})` : t(key);
  }
  return t("ai.err.other");
}
