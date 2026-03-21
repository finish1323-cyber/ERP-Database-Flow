import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  suppliersTable,
  itemsTable,
  customersTable,
  ordersTable,
  invoicesTable,
  inventoryTable,
} from "@workspace/db/schema";
import { count, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res) => {
  try {
    const [suppliersCount] = await db.select({ count: count() }).from(suppliersTable);
    const [itemsCount] = await db.select({ count: count() }).from(itemsTable);
    const [customersCount] = await db.select({ count: count() }).from(customersTable);
    const [ordersCount] = await db.select({ count: count() }).from(ordersTable);
    const [invoicesCount] = await db.select({ count: count() }).from(invoicesTable);

    const inventoryAll = await db.select().from(inventoryTable);
    const lowStockCount = inventoryAll.filter((i) => i.quantityAvailable <= i.safetyLevel).length;

    const pendingOrders = await db
      .select({ count: count() })
      .from(ordersTable)
      .where(sql`${ordersTable.status} = 'pending'`);

    const totalRevenue = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoicesTable.total}), 0)` })
      .from(invoicesTable)
      .where(sql`${invoicesTable.status} = 'paid'`);

    res.json({
      suppliersCount: suppliersCount.count,
      itemsCount: itemsCount.count,
      customersCount: customersCount.count,
      ordersCount: ordersCount.count,
      invoicesCount: invoicesCount.count,
      lowStockCount,
      pendingOrdersCount: pendingOrders[0].count,
      totalRevenue: parseFloat(totalRevenue[0].total),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
