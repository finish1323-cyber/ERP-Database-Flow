import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { suppliersTable } from "@workspace/db/schema";
import { eq, like, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/suppliers", async (req, res): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    if (search) {
      const pattern = `%${search}%`;
      const results = await db
        .select()
        .from(suppliersTable)
        .where(or(like(suppliersTable.name, pattern), like(suppliersTable.contactName, pattern)));
      res.json(results);
      return;
    }
    const results = await db.select().from(suppliersTable);
    res.json(results);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/suppliers", async (req, res): Promise<void> => {
  try {
    const { name, contactName, phone, email, address } = req.body as {
      name: string;
      contactName?: string;
      phone?: string;
      email?: string;
      address?: string;
    };
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [created] = await db.insert(suppliersTable).values({ name, contactName, phone, email, address }).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/suppliers/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
    if (!supplier) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }
    res.json(supplier);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/suppliers/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, contactName, phone, email, address } = req.body as {
      name?: string;
      contactName?: string;
      phone?: string;
      email?: string;
      address?: string;
    };
    const [updated] = await db
      .update(suppliersTable)
      .set({ name, contactName, phone, email, address })
      .where(eq(suppliersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/suppliers/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
