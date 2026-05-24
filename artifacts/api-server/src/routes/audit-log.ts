import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { auditLogTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
import { requireRole } from "../middlewares/require-auth";

const router: IRouter = Router();

router.get("/audit-log", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || "100"), 500);
    const results = await db
      .select()
      .from(auditLogTable)
      .orderBy(desc(auditLogTable.createdAt))
      .limit(limit);
    res.json(results);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
