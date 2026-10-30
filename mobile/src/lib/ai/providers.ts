import type { ProviderId } from "../store";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  kind: "anthropic" | "openai"; // request format; most providers accept the OpenAI format
  baseUrl: string;
  images: boolean; // whether the usual models accept photos
  defaultModel: string; // may be empty: pick one with "Load models"
  keySite: string; // where people create a key (shown as text)
}

// Base URLs are editable in the app ("Advanced"), so a changed endpoint never blocks anyone.
export const PROVIDERS: ProviderInfo[] = [
  { id: "anthropic", name: "Claude", kind: "anthropic", baseUrl: "https://api.anthropic.com/v1", images: true, defaultModel: "claude-sonnet-5-5", keySite: "console.anthropic.com" },
  { id: "openai", name: "ChatGPT", kind: "openai", baseUrl: "https://api.openai.com/v1", images: true, defaultModel: "", keySite: "platform.openai.com" },
  { id: "gemini", name: "Gemini", kind: "openai", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", images: true, defaultModel: "", keySite: "aistudio.google.com" },
  { id: "deepseek", name: "DeepSeek", kind: "openai", baseUrl: "https://api.deepseek.com/v1", images: false, defaultModel: "deepseek-chat", keySite: "platform.deepseek.com" },
  { id: "qwen", name: "通义千问 Qwen", kind: "openai", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", images: true, defaultModel: "", keySite: "bailian.console.aliyun.com" },
  { id: "doubao", name: "豆包 Doubao", kind: "openai", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", images: true, defaultModel: "", keySite: "console.volcengine.com/ark" },
  { id: "openrouter", name: "OpenRouter", kind: "openai", baseUrl: "https://openrouter.ai/api/v1", images: true, defaultModel: "", keySite: "openrouter.ai/keys" },
  { id: "custom", name: "Other", kind: "openai", baseUrl: "", images: true, defaultModel: "", keySite: "" },
];

export const providerInfo = (id: ProviderId) => PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[PROVIDERS.length - 1];
