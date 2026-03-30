import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const webinarsTable = pgTable("webinars", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  zoomUrl: text("zoom_url").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  status: text("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWebinarSchema = createInsertSchema(webinarsTable).omit({ id: true, createdAt: true });
export type InsertWebinar = z.infer<typeof insertWebinarSchema>;
export type Webinar = typeof webinarsTable.$inferSelect;
