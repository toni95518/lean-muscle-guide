import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { pool } from "../src/db";

const app = createApp();
const api = () => request(app);
let n = 0;

async function signUp() {
  const res = await api().post("/api/auth/register").send({ email: `backup${Date.now()}${n++}@example.com`, password: "correct horse" });
  expect(res.status).toBe(201);
  return { Authorization: `Bearer ${res.body.token}` };
}

const snapshot = (days = 2) => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  profile: { sex: "female", age: 30, weightKg: 60 },
  favorites: [{ id: "a", name: "Oats", kcal: 150 }],
  days: Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.UTC(2022, 0, 1 + i)).toISOString().slice(0, 10),
    food: [{ id: `f${i}`, name: "Rice", kcal: 200, quantity: 1 }],
    exercise: [],
    waterGlasses: 4,
    weightKg: null,
  })),
  language: "zh",
});

afterAll(() => pool.end());

describe("backup", () => {
  it("requires sign-in", async () => {
    expect((await api().get("/api/backup")).status).toBe(401);
    expect((await api().put("/api/backup").send({ data: snapshot() })).status).toBe(401);
  });

  it("returns 404 before the first backup", async () => {
    const res = await api().get("/api/backup").set(await signUp());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });

  it("stores, replaces and returns the snapshot", async () => {
    const auth = await signUp();
    const first = await api().put("/api/backup").set(auth).send({ data: snapshot(2) });
    expect(first.status).toBe(200);
    expect(first.body.bytes).toBeGreaterThan(0);

    const second = await api().put("/api/backup").set(auth).send({ data: snapshot(3) });
    expect(second.status).toBe(200);
    expect(new Date(second.body.updatedAt) >= new Date(first.body.updatedAt)).toBe(true);

    const got = await api().get("/api/backup").set(auth);
    expect(got.status).toBe(200);
    expect(got.body.data.days).toHaveLength(3);
    expect(got.body.data.days[0].food[0].name).toBe("Rice"); // extra fields are kept
    expect(got.body.data.language).toBe("zh");
  });

  it("keeps each account's backup separate", async () => {
    const a = await signUp();
    const b = await signUp();
    await api().put("/api/backup").set(a).send({ data: snapshot(1) });
    expect((await api().get("/api/backup").set(b)).status).toBe(404);
  });

  it("rejects malformed snapshots", async () => {
    const auth = await signUp();
    const bad = await api().put("/api/backup").set(auth).send({ data: { ...snapshot(), version: 2 } });
    expect(bad.status).toBe(400);
    const badDate = await api().put("/api/backup").set(auth).send({ data: { ...snapshot(), days: [{ date: "yesterday" }] } });
    expect(badDate.status).toBe(400);
  });

  it("accepts backups bigger than the normal 100 kb body limit", async () => {
    const auth = await signUp();
    const res = await api().put("/api/backup").set(auth).send({ data: snapshot(1500) });
    expect(res.status).toBe(200);
    expect(res.body.bytes).toBeGreaterThan(100 * 1024);
  });

  it("deleting the account removes its backup and its login", async () => {
    const email = `gone${Date.now()}@example.com`;
    const reg = await api().post("/api/auth/register").send({ email, password: "correct horse" });
    const auth = { Authorization: `Bearer ${reg.body.token}` };
    await api().put("/api/backup").set(auth).send({ data: snapshot(1) });
    const id = (await api().get("/api/me").set(auth)).body.user.id;
    expect((await api().delete("/api/me").set(auth)).status).toBe(204);
    expect((await api().get("/api/backup").set(auth)).status).toBe(404); // backup gone (the app also discards the token)
    expect((await api().post("/api/auth/login").send({ email, password: "correct horse" })).status).toBe(401);
    const left = await pool.query("select count(*)::int as n from backups where user_id = $1", [id]);
    expect(left.rows[0].n).toBe(0);
  });

  it("deletes the backup", async () => {
    const auth = await signUp();
    await api().put("/api/backup").set(auth).send({ data: snapshot(1) });
    expect((await api().delete("/api/backup").set(auth)).status).toBe(204);
    expect((await api().get("/api/backup").set(auth)).status).toBe(404);
  });
});
