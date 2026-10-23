import { eq } from "drizzle-orm";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { db } from "../db";
import { users } from "../db/schema";
import { checkPassword, hashPassword, signToken } from "../lib/auth";
import { HttpError } from "../lib/errors";
import { exchangeWechatCode } from "../lib/wechat";
import { env } from "../env";
import { getOrCreateProfile, serializeProfile, targetsFor } from "../services/profile";

export const authRouter = Router();

// Slow down password guessing. Disabled in tests.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  handler: (_req, res) =>
    res.status(429).json({ error: { code: "rate_limited", message: "Too many attempts. Try again in 15 minutes." } }),
});

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const credentials = z.object({
  email,
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

type User = typeof users.$inferSelect;
const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, hasWechat: !!u.wechatOpenId });

async function session(u: User) {
  const profile = await getOrCreateProfile(u.id);
  return { token: signToken(u.id), user: publicUser(u), profile: serializeProfile(profile), targets: targetsFor(profile) };
}

authRouter.post("/register", limiter, async (req, res) => {
  const body = credentials.extend({ name: z.string().trim().max(60).optional() }).parse(req.body);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email));
  if (existing) throw new HttpError(409, "email_taken", "An account with this email already exists. Sign in instead.");
  const [user] = await db
    .insert(users)
    .values({ email: body.email, passwordHash: await hashPassword(body.password), name: body.name || null })
    .returning();
  res.status(201).json(await session(user));
});

authRouter.post("/login", limiter, async (req, res) => {
  const body = credentials.parse(req.body);
  const [user] = await db.select().from(users).where(eq(users.email, body.email));
  const ok = user?.passwordHash ? await checkPassword(body.password, user.passwordHash) : false;
  if (!user || !ok) throw new HttpError(401, "invalid_credentials", "Email or password is incorrect");
  res.json(await session(user));
});

// WeChat Mini Program: the client calls wx.login() and sends the code here.
authRouter.post("/wechat", limiter, async (req, res) => {
  const { code } = z.object({ code: z.string().min(1).max(256) }).parse(req.body);
  const { openid } = await exchangeWechatCode(code);
  let [user] = await db.select().from(users).where(eq(users.wechatOpenId, openid));
  if (!user) {
    [user] = await db.insert(users).values({ wechatOpenId: openid }).onConflictDoNothing().returning();
    if (!user) [user] = await db.select().from(users).where(eq(users.wechatOpenId, openid));
  }
  res.json(await session(user));
});
