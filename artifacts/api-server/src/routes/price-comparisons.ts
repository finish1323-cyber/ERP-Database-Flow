import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { priceComparisonsTable, suppliersTable, itemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/price-comparisons", async (req, res) => {
  try {
    const itemId = req.query.itemId ? parseInt(req.query.itemId as string) : undefined;
    const supplierId = req.query.supplierId ? parseInt(req.query.supplierId as string) : undefined;

    let baseQuery = db
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

    if (itemId) {
      const results = await db
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
        .leftJoin(suppliersTable, eq(priceComparisonsTable.supplierId, suppliersTable.id))
        .where(eq(priceComparisonsTable.itemId, itemId));
      return res.json(results);
    }

    if (supplierId) {
      const results = await db
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
        .leftJoin(suppliersTable, eq(priceComparisonsTable.supplierId, suppliersTable.id))
        .where(eq(priceComparisonsTable.supplierId, supplierId));
      return res.json(results);
    }

    const results = await baseQuery;
    res.json(results);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/price-comparisons", async (req, res) => {
  try {
    const { itemId, supplierId, quotedPrice, validUntil, notes } = req.body;
    if (!itemId || !supplierId || !quotedPrice) {
      return res.status(400).json({ error: "itemId, supplierId and quotedPrice are required" });
    }
    const [created] = await db
      .insert(priceComparisonsTable)
      .values({ itemId, supplierId, quotedPrice: quotedPrice.toString(), validUntil: validUntil ? new Date(validUntil) : null, notes })
      .returning();
    res.status(201).json({ ...created, itemName: null, supplierName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/price-comparisons/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [result] = await db
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
      .leftJoin(suppliersTable, eq(priceComparisonsTable.supplierId, suppliersTable.id))
      .where(eq(priceComparisonsTable.id, id));
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/price-comparisons/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { itemId, supplierId, quotedPrice, validUntil, notes } = req.body;
    const [updated] = await db
      .update(priceComparisonsTable)
      .set({ itemId, supplierId, quotedPrice: quotedPrice?.toString(), validUntil: validUntil ? new Date(validUntil) : null, notes })
      .where(eq(priceComparisonsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ ...updated, itemName: null, supplierName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/price-comparisons/:id", async (req, res) => {
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
