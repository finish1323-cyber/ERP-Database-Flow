import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// GET /notifications
router.get("/notifications", async (req, res): Promise<void> => {
  try {
    const me = req.session?.employeeId ?? null;
    if (!me) {
      res.json([]);
      return;
    }
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.employeeId, me))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /notifications/read-all  (must be before /:id/read)
router.put("/notifications/read-all", async (req, res): Promise<void> => {
  try {
    const me = req.session?.employeeId ?? null;
    if (!me) {
      res.json({ ok: true });
      return;
    }
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.employeeId, me), eq(notificationsTable.isRead, false)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /notifications/:id/read
router.put("/notifications/:id/read", async (req, res): Promise<void> => {
  try {
    const me = req.session?.employeeId ?? null;
    const id = parseInt(req.params["id"] as string);
    if (!me) {
      res.status(400).json({ error: "not an employee account" });
      return;
    }
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.employeeId, me)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /notifications/unread-count
router.get("/notifications/unread-count", async (req, res): Promise<void> => {
  try {
    const me = req.session?.employeeId ?? null;
    if (!me) {
      res.json({ count: 0 });
      return;
    }
    const [row] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.employeeId, me), eq(notificationsTable.isRead, false)));
    res.json({ count: parseInt(row?.count ?? "0") });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
