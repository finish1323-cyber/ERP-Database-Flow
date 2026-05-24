import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { companyProfileTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/require-auth";

const router: IRouter = Router();

async function getOrCreateProfile() {
  const [existing] = await db.select().from(companyProfileTable);
  if (existing) return existing;
  const [created] = await db.insert(companyProfileTable).values({}).returning();
  return created;
}

router.get("/company-profile", async (req, res): Promise<void> => {
  try {
    const profile = await getOrCreateProfile();
    res.json(profile);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/company-profile", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const setPayload: Record<string, unknown> = { updatedAt: new Date() };
    const allowed = ["name", "activity", "address", "phone", "commercialReg", "taxId", "currency", "logoData", "defaultSafetyLevel"];
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, field)) setPayload[field] = body[field];
    }
    const profile = await getOrCreateProfile();
    const [updated] = await db
      .update(companyProfileTable)
      .set(setPayload)
      .where(eq(companyProfileTable.id, profile.id))
      .returning();
    res.json(updated ?? profile);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
