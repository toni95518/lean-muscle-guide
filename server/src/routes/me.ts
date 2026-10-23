import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { profiles, pushTokens, users } from "../db/schema";
import { notFound } from "../lib/errors";
import { uid } from "../middleware/auth";
import { getOrCreateProfile, serializeProfile, targetsFor } from "../services/profile";

export const meRouter = Router();

meRouter.get("/me", async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, uid(req)));
  if (!user) throw notFound("Account");
  const profile = await getOrCreateProfile(user.id);
  res.json({
    user: { id: user.id, email: user.email, name: user.name, hasWechat: !!user.wechatOpenId },
    profile: serializeProfile(profile),
    targets: targetsFor(profile),
  });
});

// Permanently deletes the account and all its data (cascades).
meRouter.delete("/me", async (req, res) => {
  await db.delete(users).where(eq(users.id, uid(req)));
  res.status(204).end();
});

const profilePatch = z
  .object({
    sex: z.enum(["female", "male"]),
    age: z.number().int().min(13).max(100),
    heightCm: z.number().min(100).max(260),
    weightKg: z.number().min(25).max(400),
    activity: z.number().min(1.1).max(2.0),
    goal: z.enum(["lose1", "lose05", "maintain", "gain05"]),
    calorieOverride: z.number().int().min(800).max(6000).nullable(),
    proteinPerKg: z.number().min(0.6).max(3.0),
    waterGoal: z.number().int().min(1).max(20),
    weightUnit: z.enum(["kg", "lb", "jin"]),
    heightUnit: z.enum(["cm", "ftin"]),
    setupComplete: z.boolean(),
  })
  .partial()
  .strict();

meRouter.get("/profile", async (req, res) => {
  const profile = await getOrCreateProfile(uid(req));
  res.json({ profile: serializeProfile(profile), targets: targetsFor(profile) });
});

meRouter.patch("/profile", async (req, res) => {
  const patch = profilePatch.parse(req.body);
  await getOrCreateProfile(uid(req));
  const [profile] = await db.update(profiles).set(patch).where(eq(profiles.userId, uid(req))).returning();
  res.json({ profile: serializeProfile(profile), targets: targetsFor(profile) });
});

meRouter.get("/targets", async (req, res) => {
  res.json(targetsFor(await getOrCreateProfile(uid(req))));
});

// Push notification device tokens (used by reminders in v2).
meRouter.post("/push-tokens", async (req, res) => {
  const body = z
    .object({ platform: z.enum(["ios", "android", "web", "wechat"]), token: z.string().min(8).max(4096) })
    .parse(req.body);
  await db
    .insert(pushTokens)
    .values({ userId: uid(req), ...body })
    .onConflictDoUpdate({ target: pushTokens.token, set: { userId: uid(req), platform: body.platform, lastSeenAt: new Date() } });
  res.status(204).end();
});
