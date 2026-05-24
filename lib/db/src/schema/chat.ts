import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";

export const chatChannelsTable = pgTable("chat_channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").references(() => employeesTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => chatChannelsTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").references(() => employeesTable.id),
  receiverId: integer("receiver_id").references(() => employeesTable.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isRead: boolean("is_read").notNull().default(false),
});
