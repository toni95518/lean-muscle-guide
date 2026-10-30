// Optional account: only used to back up and restore the on-device log.
// Talks to the same server as the web app (server/src/routes/backup.ts).
import type { Snapshot } from "./store";

export const DEFAULT_SERVER = "https://lean-muscle-guide.onrender.com";

export class AccountError extends Error {
  constructor(public code: string, message = code) {
    super(message);
  }
}

async function req(server: string, path: string, init: RequestInit & { token?: string } = {}) {
  let res: Response;
  try {
    res = await fetch(server.replace(/\/+$/, "") + "/api" + path, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      },
    });
  } catch {
    throw new AccountError("offline");
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new AccountError(body?.error?.code ?? (res.status === 401 ? "unauthorized" : "other"), body?.error?.message);
  return body;
}

export async function signIn(server: string, email: string, password: string, create: boolean): Promise<string> {
  const r = await req(server, create ? "/auth/register" : "/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  return r.token as string;
}

export async function uploadBackup(server: string, token: string, data: Snapshot): Promise<string> {
  const r = await req(server, "/backup", { method: "PUT", token, body: JSON.stringify({ data }) });
  return r.updatedAt as string;
}

export async function downloadBackup(server: string, token: string): Promise<{ data: Snapshot; updatedAt: string }> {
  return req(server, "/backup", { method: "GET", token });
}
