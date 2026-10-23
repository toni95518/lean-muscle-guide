import { createApp } from "./app";
import { pool } from "./db";
import { env } from "./env";

const server = createApp().listen(env.PORT, () => {
  console.log(`薄肌理论指南 (Lean Muscle Theory Guide) API listening on http://localhost:${env.PORT}`);
});

function shutdown() {
  server.close(() => pool.end().then(() => process.exit(0)));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
