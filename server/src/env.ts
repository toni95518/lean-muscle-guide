import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().optional().default(""),
  WECHAT_APPID: z.string().optional().default(""),
  WECHAT_SECRET: z.string().optional().default(""),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:\n" + parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"));
  console.error("Copy .env.example to .env and fill it in.");
  process.exit(1);
}

export const env = parsed.data;
