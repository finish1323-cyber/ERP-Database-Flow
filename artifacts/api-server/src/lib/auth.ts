import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

let cachedSecret: string | null = null;
let warnedGeneratedSecret = false;
let warnedMissingPassword = false;

function getSessionSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env["SESSION_SECRET"];
  if (fromEnv && fromEnv.length > 0) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }
  cachedSecret = crypto.randomBytes(32).toString("hex");
  if (!warnedGeneratedSecret) {
    logger.warn(
      "SESSION_SECRET is not set. A random secret was generated for this " +
        "process; sessions will be invalidated on every restart. " +
        "Set SESSION_SECRET in the Secrets pane to persist sessions.",
    );
    warnedGeneratedSecret = true;
  }
  return cachedSecret;
}

export function getTeamPassword(): string | null {
  const fromEnv = process.env["TEAM_PASSWORD"];
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (!warnedMissingPassword) {
    logger.warn(
      "TEAM_PASSWORD is not set. Shared-password fallback is disabled. " +
        "Create employee accounts via the Settings panel to enable sign-in.",
    );
    warnedMissingPassword = true;
  }
  return null;
}

export type UserRole = "admin" | "purchasing" | "sales" | "warehouse";

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLen), "base64");
}

function sign(payload: string): string {
  const secret = getSessionSecret();
  return base64UrlEncode(crypto.createHmac("sha256", secret).update(payload).digest());
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface SessionPayload {
  sub: string;
  role: UserRole;
  name: string;
  employeeId: number | null;
  iat: number;
  exp: number;
}

export function issueSessionToken(
  subject: string,
  role: UserRole,
  name: string,
  employeeId: number | null,
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: subject,
    role,
    name,
    employeeId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const encoded = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expected = sign(encoded);
  if (!timingSafeEqualStr(signature, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encoded).toString("utf8"));
  } catch {
    return null;
  }

  if (
    !payload ||
    typeof payload.sub !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  if (Math.floor(Date.now() / 1000) >= payload.exp) return null;

  if (!payload.role) payload.role = "admin";
  if (!payload.name) payload.name = "";

  return payload;
}

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 12);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

export function verifyTeamPassword(provided: string): boolean {
  const expected = getTeamPassword();
  if (expected === null) return false;
  if (provided.length === 0 || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
