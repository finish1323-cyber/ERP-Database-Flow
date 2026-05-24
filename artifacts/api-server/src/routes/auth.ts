import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { employeesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  issueSessionToken,
  verifySessionToken,
  verifyPassword,
  verifyTeamPassword,
  type UserRole,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const body = req.body as { email?: unknown; password?: unknown } | undefined;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    res.status(400).json({ error: "credentials_required", message: "يرجى إدخال البريد الإلكتروني وكلمة المرور." });
    return;
  }

  // Try employee lookup first
  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.email, email));

  if (employee) {
    if (!employee.isActive) {
      res.status(403).json({ error: "account_disabled", message: "هذا الحساب موقوف. يرجى التواصل مع المدير." });
      return;
    }
    const valid = await verifyPassword(password, employee.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "invalid_credentials", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
      return;
    }
    const token = issueSessionToken(String(employee.id), employee.role as UserRole, employee.name, employee.id);
    res.json({ token, role: employee.role, name: employee.name });
    return;
  }

  // Fallback: TEAM_PASSWORD for bootstrap admin when no employee accounts exist
  const [anyEmployee] = await db.select({ id: employeesTable.id }).from(employeesTable).limit(1);
  if (!anyEmployee && verifyTeamPassword(password)) {
    const token = issueSessionToken("team", "admin", "المدير", null);
    res.json({ token, role: "admin", name: "المدير" });
    return;
  }

  res.status(401).json({ error: "invalid_credentials", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ ok: true });
});

router.get("/auth/me", (req, res) => {
  const header = req.headers["authorization"];
  const token =
    typeof header === "string" && header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const session = token ? verifySessionToken(token) : null;
  if (!session) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.json({
    authenticated: true,
    sub: session.sub,
    role: session.role,
    name: session.name,
    employeeId: session.employeeId,
    exp: session.exp,
  });
});

export default router;
