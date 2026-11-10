import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../env.js";

// Access tokens carry only the user id; the household is always read from the
// database, so nothing in the token can widen a caller's scope.
export type AccessTokenPayload = { sub: string };

const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

// Refresh tokens are `${sessionId}.${secret}` (same scheme as RsvpVault/BorrowVault):
// the id finds the row, only a bcrypt hash of the secret is stored.
export function generateRefreshSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function parseRefreshToken(token: string): { sessionId: string; secret: string } | null {
  const idx = token.indexOf(".");
  if (idx < 0) return null;
  const sessionId = token.slice(0, idx);
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  return { sessionId, secret: token.slice(idx + 1) };
}
