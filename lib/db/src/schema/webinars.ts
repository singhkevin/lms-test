import { pgTable, text, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const webinarsTable = pgTable("webinars", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  zoomUrl: text("zoom_url").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  status: text("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webinarRsvpsTable = pgTable("webinar_rsvps", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  webinarId: text("webinar_id").notNull().references(() => webinarsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("webinar_rsvps_webinar_user_unique").on(t.webinarId, t.userId),
]);

export const insertWebinarSchema = createInsertSchema(webinarsTable).omit({ id: true, createdAt: true });
export type InsertWebinar = z.infer<typeof insertWebinarSchema>;
export type Webinar = typeof webinarsTable.$inferSelect;
export type WebinarRsvp = typeof webinarRsvpsTable.$inferSelect;
