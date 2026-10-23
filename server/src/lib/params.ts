import type { Request } from "express";
import { z } from "zod";
import { isoDate } from "./dates";
import { HttpError, notFound } from "./errors";

const uuid = z.string().uuid();

export function idParam(req: Request, what: string): string {
  const r = uuid.safeParse(req.params.id);
  if (!r.success) throw notFound(what);
  return r.data;
}

export function dateParam(req: Request): string {
  const r = isoDate.safeParse(req.params.date);
  if (!r.success) throw new HttpError(400, "invalid_date", r.error.issues[0].message);
  return r.data;
}

/** Escape LIKE wildcards in user search text. */
export const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);
