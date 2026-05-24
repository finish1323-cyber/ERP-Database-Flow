import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const companyProfileTable = pgTable("company_profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  activity: text("activity"),
  address: text("address"),
  phone: text("phone"),
  commercialReg: text("commercial_reg"),
  taxId: text("tax_id"),
  currency: text("currency").notNull().default("EGP"),
  logoData: text("logo_data"),
  defaultSafetyLevel: integer("default_safety_level").notNull().default(5),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
