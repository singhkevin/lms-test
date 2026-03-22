import { pgTable, text, timestamp, pgEnum, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { coursesTable } from "./courses";

export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "failed", "refunded"]);

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  courseId: text("course_id").notNull().references(() => coursesTable.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentGateway: text("payment_gateway"),
  gatewayOrderId: text("gateway_order_id"),
  affiliateCode: text("affiliate_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
