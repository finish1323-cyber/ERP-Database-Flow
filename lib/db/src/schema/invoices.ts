import { pgTable, serial, integer, text, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  invoiceNumber: text("invoice_number").notNull(),
  issuedAt: timestamp("issued_at").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  status: text("status", { enum: ["draft", "issued", "paid", "cancelled"] }).notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
