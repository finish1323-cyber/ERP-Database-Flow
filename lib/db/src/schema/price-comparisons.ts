import { pgTable, serial, integer, text, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";
import { itemsTable } from "./items";

export const priceComparisonsTable = pgTable("price_comparisons", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id),
  quotedPrice: decimal("quoted_price", { precision: 12, scale: 2 }).notNull(),
  validUntil: timestamp("valid_until"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPriceComparisonSchema = createInsertSchema(priceComparisonsTable).omit({ id: true, createdAt: true });
export type InsertPriceComparison = z.infer<typeof insertPriceComparisonSchema>;
export type PriceComparison = typeof priceComparisonsTable.$inferSelect;
