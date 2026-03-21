import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { itemsTable } from "@workspace/db/schema";
import { eq, like, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/items", async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    let results;
    if (search) {
      const pattern = `%${search}%`;
      results = await db
        .select()
        .from(itemsTable)
        .where(or(like(itemsTable.name, pattern), like(itemsTable.description, pattern)));
    } else if (category) {
      results = await db.select().from(itemsTable).where(eq(itemsTable.category, category));
    } else {
      results = await db.select().from(itemsTable);
    }
    res.json(results);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/items", async (req, res) => {
  try {
    const { name, description, category, defaultPrice } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [created] = await db.insert(itemsTable).values({ name, description, category, defaultPrice: defaultPrice?.toString() }).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [item] = await db.select().from(itemsTable).where(eq(itemsTable.id, id));
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, category, defaultPrice } = req.body;
    const [updated] = await db
      .update(itemsTable)
      .set({ name, description, category, defaultPrice: defaultPrice?.toString() })
      .where(eq(itemsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Item not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/items/:id", async (req, res) => {
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
