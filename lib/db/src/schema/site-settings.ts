import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteTitle: text("site_title").notNull().default("LMS Academy"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  socialShareImageUrl: text("social_share_image_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SiteSettings = typeof siteSettingsTable.$inferSelect;
