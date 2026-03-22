import { pgTable, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const affiliatesTable = pgTable("affiliates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  totalReferrals: integer("total_referrals").notNull().default(0),
  totalRevenue: numeric("total_revenue", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAffiliateSchema = createInsertSchema(affiliatesTable).omit({ id: true, createdAt: true });
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type Affiliate = typeof affiliatesTable.$inferSelect;
