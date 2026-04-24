import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db/schema";
import { eq, like, or } from "drizzle-orm";
import { toNumber } from "../lib/normalize";

const router: IRouter = Router();

type CustomerRow = typeof customersTable.$inferSelect;

function serialize(row: CustomerRow) {
  return { ...row, deliverySuccessRate: toNumber(row.deliverySuccessRate) };
}

router.get("/customers", async (req, res): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    if (search) {
      const pattern = `%${search}%`;
      const results = await db
        .select()
        .from(customersTable)
        .where(or(like(customersTable.name, pattern), like(customersTable.phone, pattern)));
      res.json(results.map(serialize));
      return;
    }
    const results = await db.select().from(customersTable);
    res.json(results.map(serialize));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/customers", async (req, res): Promise<void> => {
  try {
    const { name, phone, email, deliverySuccessRate, notes } = req.body as {
      name: string;
      phone?: string;
      email?: string;
      deliverySuccessRate?: number;
      notes?: string;
    };
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [created] = await db
      .insert(customersTable)
      .values({
        name,
        phone,
        email,
        deliverySuccessRate: deliverySuccessRate != null ? String(deliverySuccessRate) : null,
        notes,
      })
      .returning();
    res.status(201).json(serialize(created));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(serialize(customer));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/customers/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body as Record<string, unknown>;
    const setPayload: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(body, "name")) setPayload.name = body.name;
    if (Object.prototype.hasOwnProperty.call(body, "phone")) setPayload.phone = body.phone;
    if (Object.prototype.hasOwnProperty.call(body, "email")) setPayload.email = body.email;
    if (Object.prototype.hasOwnProperty.call(body, "notes")) setPayload.notes = body.notes;
    if (Object.prototype.hasOwnProperty.call(body, "deliverySuccessRate")) {
      setPayload.deliverySuccessRate = body.deliverySuccessRate != null ? String(body.deliverySuccessRate) : null;
    }

    if (Object.keys(setPayload).length === 0) {
      res.status(400).json({ error: "no fields to update" });
      return;
    }

    const [updated] = await db
      .update(customersTable)
      .set(setPayload)
      .where(eq(customersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(serialize(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(customersTable).where(eq(customersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
