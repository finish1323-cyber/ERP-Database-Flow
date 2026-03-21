import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db/schema";
import { eq, like, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/customers", async (req, res): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    if (search) {
      const pattern = `%${search}%`;
      const results = await db
        .select()
        .from(customersTable)
        .where(or(like(customersTable.name, pattern), like(customersTable.phone, pattern)));
      res.json(results);
      return;
    }
    const results = await db.select().from(customersTable);
    res.json(results);
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
    res.status(201).json(created);
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
    res.json(customer);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/customers/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, email, deliverySuccessRate, notes } = req.body as {
      name?: string;
      phone?: string;
      email?: string;
      deliverySuccessRate?: number;
      notes?: string;
    };
    const [updated] = await db
      .update(customersTable)
      .set({
        name,
        phone,
        email,
        deliverySuccessRate: deliverySuccessRate != null ? String(deliverySuccessRate) : null,
        notes,
      })
      .where(eq(customersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(updated);
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
