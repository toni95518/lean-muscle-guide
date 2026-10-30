import path from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./env";
import { requireAuth } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { authRouter } from "./routes/auth";
import { daysRouter } from "./routes/days";
import { libraryRouter } from "./routes/library";
import { meRouter } from "./routes/me";
import { summaryRouter } from "./routes/summary";
import { aiRouter } from "./routes/ai";
import { backupRouter } from "./routes/backup";
import { pool } from "./db";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1); // behind Render/Railway/Nginx, for rate limiting by client IP
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'", "'unsafe-inline'"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          // HTTPS is the hosting platform's job. Forcing upgrades here would break
          // testing over plain HTTP from a phone on the same Wi-Fi.
          "upgrade-insecure-requests": null,
        },
      },
      // Same reason: only send HSTS when deployed behind HTTPS.
      strictTransportSecurity: env.NODE_ENV === "production",
    }),
  );
  const origins = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
  if (origins.length) app.use("/api", cors({ origin: origins }));
  // Phone backups can be a few MB; everything else stays small.
  app.use("/api/backup", express.json({ limit: "6mb" }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", async (_req, res) => {
    await pool.query("select 1");
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api", requireAuth, meRouter, daysRouter, libraryRouter, summaryRouter, aiRouter, backupRouter);
  app.use("/api", notFoundHandler);

  // The web client
  app.use(express.static(path.join(__dirname, "../../web"), { extensions: ["html"] }));

  app.use(errorHandler);
  return app;
}
