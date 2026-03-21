import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { priceComparisonsTable, suppliersTable, itemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const withJoins = () =>
  db
    .select({
      id: priceComparisonsTable.id,
      itemId: priceComparisonsTable.itemId,
      supplierId: priceComparisonsTable.supplierId,
      quotedPrice: priceComparisonsTable.quotedPrice,
      validUntil: priceComparisonsTable.validUntil,
      notes: priceComparisonsTable.notes,
      createdAt: priceComparisonsTable.createdAt,
      itemName: itemsTable.name,
      supplierName: suppliersTable.name,
    })
    .from(priceComparisonsTable)
    .leftJoin(itemsTable, eq(priceComparisonsTable.itemId, itemsTable.id))
    .leftJoin(suppliersTable, eq(priceComparisonsTable.supplierId, suppliersTable.id));

router.get("/price-comparisons", async (req, res): Promise<void> => {
  try {
    const itemId = req.query.itemId ? parseInt(req.query.itemId as string) : undefined;
    const supplierId = req.query.supplierId ? parseInt(req.query.supplierId as string) : undefined;

    if (itemId) {
      const results = await withJoins().where(eq(priceComparisonsTable.itemId, itemId));
      res.json(results);
      return;
    }
    if (supplierId) {
      const results = await withJoins().where(eq(priceComparisonsTable.supplierId, supplierId));
      res.json(results);
      return;
    }
    const results = await withJoins();
    res.json(results);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/price-comparisons", async (req, res): Promise<void> => {
  try {
    const { itemId, supplierId, quotedPrice, validUntil, notes } = req.body as {
      itemId: number;
      supplierId: number;
      quotedPrice: number;
      validUntil?: string;
      notes?: string;
    };
    if (!itemId || !supplierId || !quotedPrice) {
      res.status(400).json({ error: "itemId, supplierId and quotedPrice are required" });
      return;
    }
    const [created] = await db
      .insert(priceComparisonsTable)
      .values({
        itemId,
        supplierId,
        quotedPrice: String(quotedPrice),
        validUntil: validUntil ? new Date(validUntil) : null,
        notes,
      })
      .returning();
    res.status(201).json({ ...created, itemName: null, supplierName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/price-comparisons/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const [result] = await withJoins().where(eq(priceComparisonsTable.id, id));
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

router.put("/price-comparisons/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { itemId, supplierId, quotedPrice, validUntil, notes } = req.body as {
      itemId?: number;
      supplierId?: number;
      quotedPrice?: number;
      validUntil?: string;
      notes?: string;
    };
    const [updated] = await db
      .update(priceComparisonsTable)
      .set({
        itemId,
        supplierId,
        quotedPrice: quotedPrice != null ? String(quotedPrice) : undefined,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes,
      })
      .where(eq(priceComparisonsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ ...updated, itemName: null, supplierName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/price-comparisons/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(priceComparisonsTable).where(eq(priceComparisonsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
