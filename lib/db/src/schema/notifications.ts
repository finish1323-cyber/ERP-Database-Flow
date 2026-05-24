import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .references(() => employeesTable.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
