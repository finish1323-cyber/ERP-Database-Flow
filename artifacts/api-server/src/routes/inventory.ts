import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { inventoryTable, itemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/inventory", async (req, res): Promise<void> => {
  try {
    const lowStock = req.query.lowStock === "true";
    const results = await db
      .select({
        id: inventoryTable.id,
        itemId: inventoryTable.itemId,
        quantityAvailable: inventoryTable.quantityAvailable,
        safetyLevel: inventoryTable.safetyLevel,
        location: inventoryTable.location,
        updatedAt: inventoryTable.updatedAt,
        itemName: itemsTable.name,
      })
      .from(inventoryTable)
      .leftJoin(itemsTable, eq(inventoryTable.itemId, itemsTable.id));

    const mapped = results.map((r) => ({
      ...r,
      isLowStock: r.quantityAvailable <= r.safetyLevel,
    }));

    if (lowStock) {
      res.json(mapped.filter((r) => r.isLowStock));
      return;
    }
    res.json(mapped);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory", async (req, res): Promise<void> => {
  try {
    const { itemId, quantityAvailable, safetyLevel, location } = req.body as {
      itemId: number;
      quantityAvailable: number;
      safetyLevel: number;
      location?: string;
    };
    if (itemId == null || quantityAvailable == null || safetyLevel == null) {
      res.status(400).json({ error: "itemId, quantityAvailable, and safetyLevel are required" });
      return;
    }
    const [created] = await db
      .insert(inventoryTable)
      .values({ itemId, quantityAvailable, safetyLevel, location })
      .returning();
    res.status(201).json({ ...created, itemName: null, isLowStock: created.quantityAvailable <= created.safetyLevel });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inventory/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const [result] = await db
      .select({
        id: inventoryTable.id,
        itemId: inventoryTable.itemId,
        quantityAvailable: inventoryTable.quantityAvailable,
        safetyLevel: inventoryTable.safetyLevel,
        location: inventoryTable.location,
        updatedAt: inventoryTable.updatedAt,
        itemName: itemsTable.name,
      })
      .from(inventoryTable)
      .leftJoin(itemsTable, eq(inventoryTable.itemId, itemsTable.id))
      .where(eq(inventoryTable.id, id));
    if (!result) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...result, isLowStock: result.quantityAvailable <= result.safetyLevel });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/inventory/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { itemId, quantityAvailable, safetyLevel, location } = req.body as {
      itemId?: number;
      quantityAvailable?: number;
      safetyLevel?: number;
      location?: string;
    };
    const [updated] = await db
      .update(inventoryTable)
      .set({ itemId, quantityAvailable, safetyLevel, location, updatedAt: new Date() })
      .where(eq(inventoryTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...updated, itemName: null, isLowStock: updated.quantityAvailable <= updated.safetyLevel });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/inventory/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(inventoryTable).where(eq(inventoryTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
