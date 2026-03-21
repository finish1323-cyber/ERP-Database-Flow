import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";

export const inventoryTable = pgTable("inventory", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  quantityAvailable: integer("quantity_available").notNull().default(0),
  safetyLevel: integer("safety_level").notNull().default(0),
  location: text("location"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  movementType: text("movement_type", { enum: ["in", "out"] }).notNull(),
  quantity: integer("quantity").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInventorySchema = createInsertSchema(inventoryTable).omit({ id: true, updatedAt: true });
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventoryTable.$inferSelect;

export const insertStockMovementSchema = createInsertSchema(stockMovementsTable).omit({ id: true, createdAt: true });
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
