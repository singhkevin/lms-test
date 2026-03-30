import { pgTable, text, timestamp, pgEnum, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const courseStatusEnum = pgEnum("course_status", ["draft", "published", "archived"]);
export const lessonTypeEnum = pgEnum("lesson_type", ["video", "text", "quiz", "live"]);
export const courseTypeEnum = pgEnum("course_type", ["recorded", "live"]);

export const coursesTable = pgTable("courses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  longDescription: text("long_description"),
  courseType: courseTypeEnum("course_type").notNull().default("recorded"),
  thumbnailUrl: text("thumbnail_url"),
  price: numeric("price", { precision: 10, scale: 2 }),
  paymentLink: text("payment_link"),
  status: courseStatusEnum("status").notNull().default("draft"),
  instructorId: text("instructor_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sectionsTable = pgTable("sections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: text("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessonsTable = pgTable("lessons", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sectionId: text("section_id").notNull().references(() => sectionsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: lessonTypeEnum("type").notNull().default("text"),
  content: text("content"),
  videoUrl: text("video_url"),
  pdfUrl: text("pdf_url"),
  zoomMeetingUrl: text("zoom_meeting_url"),
  zoomPassword: text("zoom_password"),
  durationMinutes: integer("duration_minutes"),
  order: integer("order").notNull().default(0),
  isFree: boolean("is_free").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courseEnquiriesTable = pgTable("course_enquiries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: text("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  age: integer("age").notNull(),
  upscAttempts: integer("upsc_attempts").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSectionSchema = createInsertSchema(sectionsTable).omit({ id: true, createdAt: true });
export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true, createdAt: true });
export const insertCourseEnquirySchema = createInsertSchema(courseEnquiriesTable).omit({ id: true, createdAt: true });

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
export type Section = typeof sectionsTable.$inferSelect;
export type Lesson = typeof lessonsTable.$inferSelect;
export type CourseEnquiry = typeof courseEnquiriesTable.$inferSelect;
