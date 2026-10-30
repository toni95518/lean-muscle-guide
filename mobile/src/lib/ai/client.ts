// Calls the user's own AI directly from the phone with their key.
// Two request formats cover almost every provider: Anthropic's and the OpenAI-style one.
import { Platform } from "react-native";
import type { AiConfig } from "../store";
import { providerInfo } from "./providers";

export interface AiMessage {
  role: "user" | "assistant";
  text: string;
  imageBase64?: string; // JPEG, without the data: prefix
}
export interface AiRequest {
  system: string;
  messages: AiMessage[];
  maxTokens?: number;
}

export type AiErrorCode = "no_key" | "auth" | "quota" | "network" | "no_image" | "bad_model" | "empty" | "other";
export class AiError extends Error {
  constructor(public code: AiErrorCode, message: string) {
    super(message);
  }
}

const TIMEOUT_MS = 90_000;

async function call(url: string, init: RequestInit): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: ctl.signal });
  } catch {
    throw new AiError("network", "network");
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    const msg = String(body?.error?.message ?? body?.message ?? text ?? res.statusText).slice(0, 300);
    if (res.status === 401 || res.status === 403) throw new AiError("auth", msg);
    if (res.status === 402 || res.status === 429) throw new AiError("quota", msg);
    if (res.status === 404 || (res.status === 400 && /model/i.test(msg))) throw new AiError("bad_model", msg);
    throw new AiError("other", msg);
  }
  return body;
}

function headers(cfg: AiConfig, key: string): Record<string, string> {
  if (providerInfo(cfg.provider).kind === "anthropic") {
    return {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      // Only needed by the web test build; the phone app is not a browser.
      ...(Platform.OS === "web" ? { "anthropic-dangerous-direct-browser-access": "true" } : {}),
    };
  }
  return { "content-type": "application/json", authorization: `Bearer ${key}` };
}

const trimSlash = (s: string) => s.replace(/\/+$/, "");

export async function complete(cfg: AiConfig, key: string | null, req: AiRequest): Promise<string> {
  if (!key) throw new AiError("no_key", "no_key");
  const info = providerInfo(cfg.provider);
  const base = trimSlash(cfg.baseUrl || info.baseUrl);
  const hasImage = req.messages.some((m) => m.imageBase64);
  if (hasImage && !info.images && cfg.provider !== "custom") throw new AiError("no_image", "no_image");

  if (info.kind === "anthropic") {
    const body = {
      model: cfg.model,
      max_tokens: req.maxTokens ?? 1500,
      system: req.system,
      messages: req.messages.map((m) => ({
        role: m.role,
        content: [
          ...(m.imageBase64 ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: m.imageBase64 } }] : []),
          { type: "text", text: m.text },
        ],
      })),
    };
    const json = await call(`${base}/messages`, { method: "POST", headers: headers(cfg, key), body: JSON.stringify(body) });
    const out = (json?.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
    if (!out) throw new AiError("empty", "empty");
    return out;
  }

  const body = {
    model: cfg.model,
    max_tokens: req.maxTokens ?? 1500,
    temperature: 0.2,
    messages: [
      { role: "system", content: req.system },
      ...req.messages.map((m) =>
        m.imageBase64
          ? {
              role: m.role,
              content: [
                { type: "text", text: m.text },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${m.imageBase64}` } },
              ],
            }
          : { role: m.role, content: m.text },
      ),
    ],
  };
  const json = await call(`${base}/chat/completions`, { method: "POST", headers: headers(cfg, key), body: JSON.stringify(body) });
  const content = json?.choices?.[0]?.message?.content;
  const out = (Array.isArray(content) ? content.map((c: any) => c?.text ?? "").join("\n") : String(content ?? "")).trim();
  if (!out) throw new AiError("empty", "empty");
  return out;
}

/** Model ids the key can use, for the model picker. */
export async function listModels(cfg: AiConfig, key: string): Promise<string[]> {
  const info = providerInfo(cfg.provider);
  const base = trimSlash(cfg.baseUrl || info.baseUrl);
  const json = await call(`${base}/models${info.kind === "anthropic" ? "?limit=100" : ""}`, { method: "GET", headers: headers(cfg, key) });
  const list: string[] = (json?.data ?? json?.models ?? []).map((m: any) => String(m?.id ?? m?.name ?? "")).filter(Boolean);
  return [...new Set(list.map((s) => s.replace(/^models\//, "")))].sort();
}

/** Small request to confirm the key and model work. */
export async function testConnection(cfg: AiConfig, key: string): Promise<void> {
  await complete(cfg, key, { system: "Reply with the single word OK.", messages: [{ role: "user", text: "Test" }], maxTokens: 10 });
}
