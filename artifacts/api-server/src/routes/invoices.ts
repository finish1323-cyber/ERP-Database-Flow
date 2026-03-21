import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { invoicesTable, ordersTable, customersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/invoices", async (req, res): Promise<void> => {
  try {
    const orderId = req.query.orderId ? parseInt(req.query.orderId as string) : undefined;

    const results = await db
      .select({
        id: invoicesTable.id,
        orderId: invoicesTable.orderId,
        invoiceNumber: invoicesTable.invoiceNumber,
        issuedAt: invoicesTable.issuedAt,
        total: invoicesTable.total,
        status: invoicesTable.status,
        notes: invoicesTable.notes,
        createdAt: invoicesTable.createdAt,
        customerName: customersTable.name,
      })
      .from(invoicesTable)
      .leftJoin(ordersTable, eq(invoicesTable.orderId, ordersTable.id))
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id));

    const filtered = orderId ? results.filter((r) => r.orderId === orderId) : results;
    res.json(filtered);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invoices", async (req, res): Promise<void> => {
  try {
    const { orderId, invoiceNumber, issuedAt, total, status = "draft", notes } = req.body as {
      orderId: number;
      invoiceNumber: string;
      issuedAt: string;
      total: number;
      status?: "draft" | "issued" | "paid" | "cancelled";
      notes?: string;
    };
    if (!orderId || !invoiceNumber || !issuedAt || total == null) {
      res.status(400).json({ error: "orderId, invoiceNumber, issuedAt and total are required" });
      return;
    }
    const [created] = await db
      .insert(invoicesTable)
      .values({ orderId, invoiceNumber, issuedAt: new Date(issuedAt), total: total.toString(), status, notes })
      .returning();
    res.status(201).json({ ...created, customerName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const [result] = await db
      .select({
        id: invoicesTable.id,
        orderId: invoicesTable.orderId,
        invoiceNumber: invoicesTable.invoiceNumber,
        issuedAt: invoicesTable.issuedAt,
        total: invoicesTable.total,
        status: invoicesTable.status,
        notes: invoicesTable.notes,
        createdAt: invoicesTable.createdAt,
        customerName: customersTable.name,
      })
      .from(invoicesTable)
      .leftJoin(ordersTable, eq(invoicesTable.orderId, ordersTable.id))
      .leftJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
      .where(eq(invoicesTable.id, id));
    if (!result) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/invoices/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { orderId, invoiceNumber, issuedAt, total, status, notes } = req.body as {
      orderId?: number;
      invoiceNumber?: string;
      issuedAt?: string;
      total?: number;
      status?: "draft" | "issued" | "paid" | "cancelled";
      notes?: string;
    };
    const [updated] = await db
      .update(invoicesTable)
      .set({
        orderId,
        invoiceNumber,
        issuedAt: issuedAt ? new Date(issuedAt) : undefined,
        total: total != null ? total.toString() : undefined,
        status,
        notes,
      })
      .where(eq(invoicesTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    res.json({ ...updated, customerName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
