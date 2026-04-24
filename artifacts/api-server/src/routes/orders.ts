import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, customersTable, itemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { toNumber } from "../lib/normalize";

const router: IRouter = Router();

type OrderJoinedRow = {
  id: number;
  customerId: number;
  status: string;
  totalAmount: string | null;
  notes: string | null;
  createdAt: Date | string;
  customerName: string | null;
};

function serializeOrder<T extends { totalAmount: unknown }>(row: T) {
  return { ...row, totalAmount: toNumber(row.totalAmount) };
}

router.get("/orders", async (req, res): Promise<void> => {
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

    let filtered: OrderJoinedRow[] = results;
    if (customerId) filtered = filtered.filter((o) => o.customerId === customerId);
    if (status) filtered = filtered.filter((o) => o.status === status);
    res.json(filtered.map(serializeOrder));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders", async (req, res): Promise<void> => {
  try {
    const { customerId, status = "pending", notes, items } = req.body as {
      customerId: number;
      status?: "pending" | "confirmed" | "delivered" | "cancelled";
      notes?: string;
      items: Array<{ itemId: number; quantity: number; unitPrice: number }>;
    };
    if (!customerId) {
      res.status(400).json({ error: "customerId is required" });
      return;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items array is required" });
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const [order] = await db
      .insert(ordersTable)
      .values({ customerId, status, notes, totalAmount: totalAmount.toString() })
      .returning();

    await db.insert(orderItemsTable).values(
      items.map((item) => ({
        orderId: order.id,
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
      }))
    );

    res.status(201).json({ ...serializeOrder(order), customerName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:id", async (req, res): Promise<void> => {
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

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

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

    res.json({
      ...serializeOrder(order),
      items: orderItems.map((it) => ({ ...it, unitPrice: toNumber(it.unitPrice) })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/orders/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body as Record<string, unknown>;
    const setPayload: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      setPayload.status = body.status as "pending" | "confirmed" | "delivered" | "cancelled";
    }
    if (Object.prototype.hasOwnProperty.call(body, "notes")) setPayload.notes = body.notes;

    if (Object.keys(setPayload).length === 0) {
      res.status(400).json({ error: "no fields to update" });
      return;
    }

    const [updated] = await db
      .update(ordersTable)
      .set(setPayload)
      .where(eq(ordersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ ...serializeOrder(updated), customerName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/orders/:id", async (req, res): Promise<void> => {
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
