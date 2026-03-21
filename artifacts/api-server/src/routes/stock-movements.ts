import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { stockMovementsTable, itemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stock-movements", async (req, res) => {
  try {
    const itemId = req.query.itemId ? parseInt(req.query.itemId as string) : undefined;
    const type = req.query.type as "in" | "out" | undefined;

    let query = db
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

    const results = await query;
    let filtered = results;
    if (itemId) filtered = filtered.filter((r) => r.itemId === itemId);
    if (type) filtered = filtered.filter((r) => r.movementType === type);
    res.json(filtered);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stock-movements", async (req, res) => {
  try {
    const { itemId, movementType, quantity, reference, notes } = req.body;
    if (!itemId || !movementType || quantity == null) {
      return res.status(400).json({ error: "itemId, movementType and quantity are required" });
    }
    const [created] = await db
      .insert(stockMovementsTable)
      .values({ itemId, movementType, quantity, reference, notes })
      .returning();
    res.status(201).json({ ...created, itemName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stock-movements/:id", async (req, res) => {
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
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/stock-movements/:id", async (req, res) => {
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
