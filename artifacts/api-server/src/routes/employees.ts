import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { employeesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, type UserRole } from "../lib/auth";
import { requireRole } from "../middlewares/require-auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

// GET /employees/directory — basic info for all authenticated users (for DM / task assignment)
router.get("/employees/directory", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select({ id: employeesTable.id, name: employeesTable.name, role: employeesTable.role })
      .from(employeesTable)
      .where(eq(employeesTable.isActive, true));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function sanitize(row: typeof employeesTable.$inferSelect) {
  const { passwordHash: _, ...rest } = row;
  return rest;
}

router.get("/employees", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(employeesTable);
    res.json(rows.map(sanitize));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/employees", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const { name, email, password, role = "sales", jobTitle } = req.body as {
      name: string;
      email: string;
      password: string;
      role?: string;
      jobTitle?: string;
    };
    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email and password are required" });
      return;
    }
    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(employeesTable)
      .values({ name, email: email.toLowerCase().trim(), passwordHash, role: role as UserRole, jobTitle })
      .returning();
    await logAudit(req.session, "create", "employees", created.id, `أضاف موظف: ${name}`);
    res.status(201).json(sanitize(created));
  } catch (err: unknown) {
    req.log.error(err);
    if (
      err != null &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل." });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/employees/:id", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    res.json(sanitize(employee));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/employees/:id", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    const body = req.body as Record<string, unknown>;
    const setPayload: Record<string, unknown> = {};
    for (const field of ["name", "email", "role", "jobTitle", "isActive"]) {
      if (Object.prototype.hasOwnProperty.call(body, field)) setPayload[field] = body[field];
    }
    if (Object.prototype.hasOwnProperty.call(body, "password") && typeof body.password === "string" && body.password.length > 0) {
      setPayload.passwordHash = await hashPassword(body.password as string);
    }
    if (Object.keys(setPayload).length === 0) {
      res.status(400).json({ error: "no fields to update" });
      return;
    }
    const [updated] = await db.update(employeesTable).set(setPayload).where(eq(employeesTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    await logAudit(req.session, "update", "employees", id, `عدّل بيانات الموظف #${id}`);
    res.json(sanitize(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/employees/:id/toggle", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    const [updated] = await db
      .update(employeesTable)
      .set({ isActive: !employee.isActive })
      .where(eq(employeesTable.id, id))
      .returning();
    const action = updated.isActive ? "تفعيل" : "تعطيل";
    await logAudit(req.session, "update", "employees", id, `${action} حساب الموظف: ${employee.name}`);
    res.json(sanitize(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/employees/:id", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    await db.delete(employeesTable).where(eq(employeesTable.id, id));
    await logAudit(req.session, "delete", "employees", id, `حذف الموظف: ${employee.name}`);
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
