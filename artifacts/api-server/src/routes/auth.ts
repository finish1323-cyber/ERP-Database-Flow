import { Router, type IRouter } from "express";
import {
  isAuthConfigured,
  issueSessionToken,
  verifyTeamPassword,
  verifySessionToken,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", (req, res) => {
  const body = req.body as { password?: unknown } | undefined;
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password) {
    res.status(400).json({
      error: "password_required",
      message: "يرجى إدخال كلمة المرور.",
    });
    return;
  }

  if (!isAuthConfigured()) {
    res.status(503).json({
      error: "auth_not_configured",
      message:
        "تسجيل الدخول غير مُعدّ بعد. يرجى ضبط TEAM_PASSWORD في إعدادات الأسرار.",
    });
    return;
  }

  if (!verifyTeamPassword(password)) {
    res.status(401).json({
      error: "invalid_credentials",
      message: "كلمة المرور غير صحيحة.",
    });
    return;
  }

  const token = issueSessionToken();
  res.json({ token });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ ok: true });
});

router.get("/auth/me", (req, res) => {
  const header = req.headers["authorization"];
  const token =
    typeof header === "string" && header.toLowerCase().startsWith("bearer ")
      ? header.slice(7).trim()
      : "";

  const session = token ? verifySessionToken(token) : null;
  if (!session) {
    res.status(401).json({ authenticated: false });
    return;
  }

  res.json({ authenticated: true, sub: session.sub, exp: session.exp });
});

export default router;
