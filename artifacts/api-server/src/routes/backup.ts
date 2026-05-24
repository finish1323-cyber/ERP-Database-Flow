import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  suppliersTable,
  itemsTable,
  priceComparisonsTable,
  inventoryTable,
  stockMovementsTable,
  customersTable,
  ordersTable,
  orderItemsTable,
  invoicesTable,
  employeesTable,
  companyProfileTable,
  auditLogTable,
} from "@workspace/db/schema";
import { requireRole } from "../middlewares/require-auth";

const router: IRouter = Router();

router.get("/backup", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const [
      suppliers,
      items,
      priceComparisons,
      inventory,
      stockMovements,
      customers,
      orders,
      orderItems,
      invoices,
      employees,
      companyProfile,
      auditLog,
    ] = await Promise.all([
      db.select().from(suppliersTable),
      db.select().from(itemsTable),
      db.select().from(priceComparisonsTable),
      db.select().from(inventoryTable),
      db.select().from(stockMovementsTable),
      db.select().from(customersTable),
      db.select().from(ordersTable),
      db.select().from(orderItemsTable),
      db.select().from(invoicesTable),
      db.select().from(employeesTable).then((rows) =>
        rows.map(({ passwordHash: _, ...r }) => r)
      ),
      db.select().from(companyProfileTable),
      db.select().from(auditLogTable),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      data: {
        suppliers,
        items,
        priceComparisons,
        inventory,
        stockMovements,
        customers,
        orders,
        orderItems,
        invoices,
        employees,
        companyProfile,
        auditLog,
      },
    };

    const filename = `erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("content-type", "application/json");
    res.setHeader("content-disposition", `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
