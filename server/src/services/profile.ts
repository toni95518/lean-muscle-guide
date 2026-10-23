import { eq } from "drizzle-orm";
import { db } from "../db";
import { profiles, type Profile } from "../db/schema";
import { targets, type Targets } from "../lib/nutrition";

export async function getOrCreateProfile(userId: string): Promise<Profile> {
  const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (existing) return existing;
  const [created] = await db.insert(profiles).values({ userId }).onConflictDoNothing().returning();
  if (created) return created;
  const [again] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  return again;
}

export function targetsFor(p: Profile): Targets {
  return targets(p);
}

export function serializeProfile(p: Profile) {
  const { userId: _u, updatedAt, ...rest } = p;
  return { ...rest, updatedAt: updatedAt.toISOString() };
}
