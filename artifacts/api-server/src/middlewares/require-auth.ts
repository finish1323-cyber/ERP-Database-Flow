import type { NextFunction, Request, Response } from "express";
import { verifySessionToken, type SessionPayload, type UserRole } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers["authorization"];
  if (typeof header === "string" && header.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token.length > 0) return token;
  }
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "unauthorized", message: "يجب تسجيل الدخول للوصول إلى هذا المورد." });
    return;
  }
  const session = verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: "invalid_session", message: "انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مرة أخرى." });
    return;
  }
  req.session = session;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const session = req.session;
    if (!session) {
      res.status(401).json({ error: "unauthorized", message: "يجب تسجيل الدخول." });
      return;
    }
    if (!roles.includes(session.role)) {
      res.status(403).json({ error: "forbidden", message: "ليس لديك صلاحية للوصول إلى هذا المورد." });
      return;
    }
    next();
  };
}
