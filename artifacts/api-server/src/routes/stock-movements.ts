import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { stockMovementsTable, itemsTable, inventoryTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stock-movements", async (req, res): Promise<void> => {
  try {
    const itemId = req.query.itemId ? parseInt(req.query.itemId as string) : undefined;
    const type = req.query.type as "in" | "out" | undefined;

    const allResults = await db
      .select({
        id: stockMovementsTable.id,
        itemId: stockMovementsTable.itemId,
        movementType: stockMovementsTable.movementType,
        quantity: stockMovementsTable.quantity,
        reference: stockMovementsTable.reference,
        notes: stockMovementsTable.notes,
        createdAt: stockMovementsTable.createdAt,
        itemName: itemsTable.name,
      })
      .from(stockMovementsTable)
      .leftJoin(itemsTable, eq(stockMovementsTable.itemId, itemsTable.id));

    let filtered = allResults;
    if (itemId) filtered = filtered.filter((r) => r.itemId === itemId);
    if (type) filtered = filtered.filter((r) => r.movementType === type);
    res.json(filtered);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stock-movements", async (req, res): Promise<void> => {
  try {
    const { itemId, movementType, quantity, reference, notes } = req.body as {
      itemId: number;
      movementType: "in" | "out";
      quantity: number;
      reference?: string;
      notes?: string;
    };
    if (!itemId || !movementType || quantity == null) {
      res.status(400).json({ error: "itemId, movementType and quantity are required" });
      return;
    }

    const [created] = await db
      .insert(stockMovementsTable)
      .values({ itemId, movementType, quantity, reference, notes })
      .returning();

    const [existingInventory] = await db
      .select()
      .from(inventoryTable)
      .where(eq(inventoryTable.itemId, itemId));

    if (existingInventory) {
      const delta = movementType === "in" ? quantity : -quantity;
      const newQty = Math.max(0, existingInventory.quantityAvailable + delta);
      await db
        .update(inventoryTable)
        .set({ quantityAvailable: newQty, updatedAt: new Date() })
        .where(eq(inventoryTable.itemId, itemId));
    }

    res.status(201).json({ ...created, itemName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stock-movements/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const [result] = await db
      .select({
        id: stockMovementsTable.id,
        itemId: stockMovementsTable.itemId,
        movementType: stockMovementsTable.movementType,
        quantity: stockMovementsTable.quantity,
        reference: stockMovementsTable.reference,
        notes: stockMovementsTable.notes,
        createdAt: stockMovementsTable.createdAt,
        itemName: itemsTable.name,
      })
      .from(stockMovementsTable)
      .leftJoin(itemsTable, eq(stockMovementsTable.itemId, itemsTable.id))
      .where(eq(stockMovementsTable.id, id));
    if (!result) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/stock-movements/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body as Record<string, unknown>;
    const setPayload: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(body, "reference")) setPayload.reference = body.reference;
    if (Object.prototype.hasOwnProperty.call(body, "notes")) setPayload.notes = body.notes;

    if (Object.keys(setPayload).length === 0) {
      res.status(400).json({ error: "no fields to update" });
      return;
    }

    const [updated] = await db
      .update(stockMovementsTable)
      .set(setPayload)
      .where(eq(stockMovementsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...updated, itemName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/stock-movements/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(stockMovementsTable).where(eq(stockMovementsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
