import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { chatChannelsTable, chatMessagesTable, employeesTable } from "@workspace/db/schema";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { requireRole } from "../middlewares/require-auth";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// GET /chat/channels
router.get("/chat/channels", async (req, res): Promise<void> => {
  try {
    const channels = await db
      .select()
      .from(chatChannelsTable)
      .orderBy(chatChannelsTable.name);
    res.json(channels);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /chat/channels (admin only)
router.post("/chat/channels", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const { name, description } = req.body as { name: string; description?: string };
    if (!name?.trim()) {
      res.status(400).json({ error: "name required" });
      return;
    }
    const [channel] = await db
      .insert(chatChannelsTable)
      .values({ name: name.trim(), description, createdBy: req.session?.employeeId ?? null })
      .returning();
    res.status(201).json(channel);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /chat/channels/:id/messages
router.get("/chat/channels/:id/messages", async (req, res): Promise<void> => {
  try {
    const channelId = parseInt(req.params["id"] as string);
    const messages = await db
      .select({
        id: chatMessagesTable.id,
        channelId: chatMessagesTable.channelId,
        senderId: chatMessagesTable.senderId,
        senderName: employeesTable.name,
        body: chatMessagesTable.body,
        createdAt: chatMessagesTable.createdAt,
        isRead: chatMessagesTable.isRead,
      })
      .from(chatMessagesTable)
      .leftJoin(employeesTable, eq(chatMessagesTable.senderId, employeesTable.id))
      .where(eq(chatMessagesTable.channelId, channelId))
      .orderBy(chatMessagesTable.createdAt)
      .limit(100);
    res.json(messages);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /chat/channels/:id/messages
router.post("/chat/channels/:id/messages", async (req, res): Promise<void> => {
  try {
    const channelId = parseInt(req.params["id"] as string);
    const { body } = req.body as { body: string };
    if (!body?.trim()) {
      res.status(400).json({ error: "body required" });
      return;
    }
    const [msg] = await db
      .insert(chatMessagesTable)
      .values({ channelId, senderId: req.session?.employeeId ?? null, body: body.trim() })
      .returning();
    res.status(201).json(msg);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /chat/dm/:employeeId
router.get("/chat/dm/:employeeId", async (req, res): Promise<void> => {
  try {
    const me = req.session?.employeeId ?? null;
    const other = parseInt(req.params["employeeId"] as string);
    if (!me) {
      res.json([]);
      return;
    }
    const messages = await db
      .select({
        id: chatMessagesTable.id,
        senderId: chatMessagesTable.senderId,
        senderName: employeesTable.name,
        receiverId: chatMessagesTable.receiverId,
        body: chatMessagesTable.body,
        createdAt: chatMessagesTable.createdAt,
        isRead: chatMessagesTable.isRead,
      })
      .from(chatMessagesTable)
      .leftJoin(employeesTable, eq(chatMessagesTable.senderId, employeesTable.id))
      .where(
        and(
          isNull(chatMessagesTable.channelId),
          or(
            and(eq(chatMessagesTable.senderId, me), eq(chatMessagesTable.receiverId, other)),
            and(eq(chatMessagesTable.senderId, other), eq(chatMessagesTable.receiverId, me)),
          ),
        ),
      )
      .orderBy(chatMessagesTable.createdAt)
      .limit(100);
    // mark incoming as read
    await db
      .update(chatMessagesTable)
      .set({ isRead: true })
      .where(
        and(
          isNull(chatMessagesTable.channelId),
          eq(chatMessagesTable.senderId, other),
          eq(chatMessagesTable.receiverId, me),
          eq(chatMessagesTable.isRead, false),
        ),
      );
    res.json(messages);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /chat/dm/:employeeId
router.post("/chat/dm/:employeeId", async (req, res): Promise<void> => {
  try {
    const me = req.session?.employeeId ?? null;
    const other = parseInt(req.params["employeeId"] as string);
    if (!me) {
      res.status(400).json({ error: "not an employee account" });
      return;
    }
    const { body } = req.body as { body: string };
    if (!body?.trim()) {
      res.status(400).json({ error: "body required" });
      return;
    }
    const [msg] = await db
      .insert(chatMessagesTable)
      .values({ senderId: me, receiverId: other, body: body.trim() })
      .returning();
    res.status(201).json(msg);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /chat/unread-count
router.get("/chat/unread-count", async (req, res): Promise<void> => {
  try {
    const me = req.session?.employeeId ?? null;
    if (!me) {
      res.json({ count: 0 });
      return;
    }
    const [row] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(chatMessagesTable)
      .where(
        and(
          isNull(chatMessagesTable.channelId),
          eq(chatMessagesTable.receiverId, me),
          eq(chatMessagesTable.isRead, false),
        ),
      );
    res.json({ count: parseInt(row?.count ?? "0") });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
