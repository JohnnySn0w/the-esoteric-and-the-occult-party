import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const circles = sqliteTable("circles", {
  id: text("id").primaryKey(),
  hostHash: text("host_hash").notNull(),
  sealKeys: text("seal_keys").notNull(),
  mask: integer("mask").notNull().default(0),
  revision: integer("revision").notNull().default(0),
  lastSeal: text("last_seal"),
  createdAt: text("created_at").notNull(),
});
