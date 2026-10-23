import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/errors";

// Every error leaves the API in one shape:
// { "error": { "code": "validation_failed", "message": "...", "details": [...] } }
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "validation_failed",
        message: err.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; "),
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  // Malformed JSON body from express.json()
  if (typeof err === "object" && err && (err as { type?: string }).type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "invalid_json", message: "The request body is not valid JSON" } });
  }
  // Postgres invalid_text_representation (e.g. a non-UUID id in the URL)
  const pgCode = (err as { code?: string; cause?: { code?: string } })?.cause?.code ?? (err as { code?: string })?.code;
  if (pgCode === "22P02") {
    return res.status(404).json({ error: { code: "not_found", message: "Not found" } });
  }
  console.error(err);
  res.status(500).json({ error: { code: "internal", message: "Something went wrong on the server" } });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "not_found", message: "No such endpoint" } });
}
