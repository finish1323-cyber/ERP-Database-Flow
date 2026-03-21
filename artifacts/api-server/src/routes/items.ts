import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { itemsTable } from "@workspace/db/schema";
import { eq, like, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/items", async (req, res): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    if (search) {
      const pattern = `%${search}%`;
      const results = await db
        .select()
        .from(itemsTable)
        .where(or(like(itemsTable.name, pattern), like(itemsTable.description, pattern)));
      res.json(results);
      return;
    }
    if (category) {
      const results = await db.select().from(itemsTable).where(eq(itemsTable.category, category));
      res.json(results);
      return;
    }
    const results = await db.select().from(itemsTable);
    res.json(results);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/items", async (req, res): Promise<void> => {
  try {
    const { name, description, category, defaultPrice } = req.body as {
      name: string;
      description?: string;
      category?: string;
      defaultPrice?: number;
    };
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [created] = await db
      .insert(itemsTable)
      .values({ name, description, category, defaultPrice: defaultPrice != null ? String(defaultPrice) : null })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/items/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const [item] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/items/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, category, defaultPrice } = req.body as {
      name?: string;
      description?: string;
      category?: string;
      defaultPrice?: number;
    };
    const [updated] = await db
      .update(itemsTable)
      .set({ name, description, category, defaultPrice: defaultPrice != null ? String(defaultPrice) : null })
      .where(eq(itemsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/items/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(itemsTable).where(eq(itemsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
