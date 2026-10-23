import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../env";

const TOKEN_TTL = "30d";

export function signToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: TOKEN_TTL, algorithm: "HS256" });
}

/** Returns the user id, or null if the token is missing, expired or forged. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    return typeof payload === "object" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
