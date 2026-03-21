import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, customersTable, itemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/orders", async (req, res) => {
  try {
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
    const status = req.query.status as string | undefined;

    const results = await db
      .select({
        id: ordersTable.id,
        customerId: ordersTable.customerId,
        status: ordersTable.status,
        totalAmount: ordersTable.totalAmount,
        notes: ordersTable.notes,
        createdAt: ordersTable.createdAt,
        customerName: customersTable.name,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id));

    let filtered = results;
    if (customerId) filtered = filtered.filter((o) => o.customerId === customerId);
    if (status) filtered = filtered.filter((o) => o.status === status);
    res.json(filtered);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders", async (req, res) => {
  try {
    const { customerId, status = "pending", notes, items } = req.body;
    if (!customerId) return res.status(400).json({ error: "customerId is required" });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items array is required" });
    }

    const totalAmount = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);

    const [order] = await db
      .insert(ordersTable)
      .values({ customerId, status, notes, totalAmount: totalAmount.toString() })
      .returning();

    await db.insert(orderItemsTable).values(
      items.map((item: { itemId: number; quantity: number; unitPrice: number }) => ({
        orderId: order.id,
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
      }))
    );

    res.status(201).json({ ...order, customerName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [order] = await db
      .select({
        id: ordersTable.id,
        customerId: ordersTable.customerId,
        status: ordersTable.status,
        totalAmount: ordersTable.totalAmount,
        notes: ordersTable.notes,
        createdAt: ordersTable.createdAt,
        customerName: customersTable.name,
      })
      .from(ordersTable)
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(eq(ordersTable.id, id));

    if (!order) return res.status(404).json({ error: "Order not found" });

    const orderItems = await db
      .select({
        id: orderItemsTable.id,
        orderId: orderItemsTable.orderId,
        itemId: orderItemsTable.itemId,
        quantity: orderItemsTable.quantity,
        unitPrice: orderItemsTable.unitPrice,
        itemName: itemsTable.name,
      })
      .from(orderItemsTable)
      .leftJoin(itemsTable, eq(orderItemsTable.itemId, itemsTable.id))
      .where(eq(orderItemsTable.orderId, id));

    res.json({ ...order, items: orderItems });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body;
    const [updated] = await db
      .update(ordersTable)
      .set({ status, notes })
      .where(eq(ordersTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Order not found" });
    res.json({ ...updated, customerName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    await db.delete(ordersTable).where(eq(ordersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
