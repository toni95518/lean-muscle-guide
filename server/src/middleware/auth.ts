import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/auth";
import { unauthorized } from "../lib/errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  const userId = scheme === "Bearer" && token ? verifyToken(token) : null;
  if (!userId) return next(unauthorized());
  req.userId = userId;
  next();
}

/** The authenticated user's id. Only call after requireAuth. */
export function uid(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
