// Backup for the local-first mobile app: the phone uploads its whole log as one JSON
// snapshot and can download it again on a new phone. One backup per account.
import { eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { backups } from "../db/schema";
import { HttpError, notFound } from "../lib/errors";
import { uid } from "../middleware/auth";

export const BACKUP_LIMIT_BYTES = 5 * 1024 * 1024;

export const backupRouter = Router();

const snapshot = z
  .object({
    version: z.literal(1),
    exportedAt: z.string().max(40),
    profile: z.record(z.string(), z.unknown()),
    favorites: z.array(z.unknown()).max(2000),
    days: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).passthrough()).max(20000),
    language: z.enum(["en", "zh", "fr", "de"]).nullable().optional(),
  })
  .passthrough();

backupRouter.get("/backup", async (req, res) => {
  const [row] = await db.select().from(backups).where(eq(backups.userId, uid(req)));
  if (!row) throw notFound("Backup");
  res.json({ data: row.data, updatedAt: row.updatedAt.toISOString(), bytes: row.bytes });
});

backupRouter.put("/backup", async (req, res) => {
  const { data } = z.object({ data: snapshot }).parse(req.body);
  const bytes = Buffer.byteLength(JSON.stringify(data));
  if (bytes > BACKUP_LIMIT_BYTES) throw new HttpError(413, "backup_too_large", "Backup is larger than 5 MB");
  const [row] = await db
    .insert(backups)
    .values({ userId: uid(req), data, bytes })
    .onConflictDoUpdate({ target: backups.userId, set: { data, bytes, updatedAt: sql`now()` } })
    .returning();
  res.json({ updatedAt: row.updatedAt.toISOString(), bytes });
});

backupRouter.delete("/backup", async (req, res) => {
  await db.delete(backups).where(eq(backups.userId, uid(req)));
  res.status(204).end();
});
