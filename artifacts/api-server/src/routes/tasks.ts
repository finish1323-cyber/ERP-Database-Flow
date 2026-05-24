import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tasksTable, employeesTable, notificationsTable } from "@workspace/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { requireRole } from "../middlewares/require-auth";

const router: IRouter = Router();

const taskWithNames = {
  id: tasksTable.id,
  title: tasksTable.title,
  description: tasksTable.description,
  status: tasksTable.status,
  priority: tasksTable.priority,
  assignedTo: tasksTable.assignedTo,
  createdBy: tasksTable.createdBy,
  dueDate: tasksTable.dueDate,
  createdAt: tasksTable.createdAt,
  assigneeName: employeesTable.name,
};

// GET /tasks
router.get("/tasks", async (req, res): Promise<void> => {
  try {
    const me = req.session?.employeeId ?? null;
    const role = req.session?.role ?? "sales";

    if (role === "admin") {
      const rows = await db
        .select(taskWithNames)
        .from(tasksTable)
        .leftJoin(employeesTable, eq(tasksTable.assignedTo, employeesTable.id))
        .orderBy(desc(tasksTable.createdAt));
      res.json(rows);
    } else {
      if (!me) { res.json([]); return; }
      const rows = await db
        .select(taskWithNames)
        .from(tasksTable)
        .leftJoin(employeesTable, eq(tasksTable.assignedTo, employeesTable.id))
        .where(or(eq(tasksTable.assignedTo, me), eq(tasksTable.createdBy, me)))
        .orderBy(desc(tasksTable.createdAt));
      res.json(rows);
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /tasks
router.post("/tasks", async (req, res): Promise<void> => {
  try {
    const { title, description, status, priority, assignedTo, dueDate } = req.body as {
      title: string;
      description?: string;
      status?: "todo" | "in_progress" | "done";
      priority?: "low" | "medium" | "high" | "urgent";
      assignedTo?: number;
      dueDate?: string;
    };
    if (!title?.trim()) {
      res.status(400).json({ error: "title required" });
      return;
    }
    const [task] = await db
      .insert(tasksTable)
      .values({
        title: title.trim(),
        description,
        status: status ?? "todo",
        priority: priority ?? "medium",
        assignedTo: assignedTo ?? null,
        createdBy: req.session?.employeeId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();

    // Notify assigned employee
    if (assignedTo && assignedTo !== (req.session?.employeeId ?? null)) {
      await db.insert(notificationsTable).values({
        employeeId: assignedTo,
        title: "مهمة جديدة",
        body: `تم تعيين مهمة لك: ${title.trim()}`,
      }).catch(() => {});
    }

    res.status(201).json(task);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /tasks/:id
router.put("/tasks/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    const body = req.body as Record<string, unknown>;
    const setPayload: Record<string, unknown> = {};
    for (const field of ["title", "description", "status", "priority", "assignedTo"]) {
      if (Object.prototype.hasOwnProperty.call(body, field)) setPayload[field] = body[field];
    }
    if (Object.prototype.hasOwnProperty.call(body, "dueDate")) {
      setPayload["dueDate"] = body["dueDate"] ? new Date(body["dueDate"] as string) : null;
    }
    if (Object.keys(setPayload).length === 0) {
      res.status(400).json({ error: "no fields to update" });
      return;
    }
    const [updated] = await db
      .update(tasksTable)
      .set(setPayload)
      .where(eq(tasksTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /tasks/:id (admin only)
router.delete("/tasks/:id", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
