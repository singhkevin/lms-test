import { Router } from "express";
import { db, coursesTable, sectionsTable, lessonsTable, usersTable, enrollmentsTable } from "@workspace/db";
import { eq, and, ilike, sql, desc, inArray } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth.js";
import { uniqueSlug } from "../lib/slugify.js";
import { z } from "zod";

const router = Router();

const courseShape = {
  id: coursesTable.id, title: coursesTable.title, slug: coursesTable.slug,
  description: coursesTable.description, longDescription: coursesTable.longDescription,
  courseType: coursesTable.courseType, thumbnailUrl: coursesTable.thumbnailUrl,
  price: coursesTable.price, status: coursesTable.status,
  instructorId: coursesTable.instructorId, instructorName: usersTable.name,
  createdAt: coursesTable.createdAt, updatedAt: coursesTable.updatedAt,
};

interface CourseRow {
  id: string; title: string; slug: string;
  description: string | null; longDescription: string | null;
  courseType: "recorded" | "live"; thumbnailUrl: string | null;
  price: string | null; status: "draft" | "published" | "archived";
  instructorId: string | null; instructorName: string | null;
  createdAt: Date; updatedAt: Date;
}

function formatCourse(c: CourseRow, enrollmentCount = 0, moduleCount = 0) {
  return { ...c, price: c.price ? Number(c.price) : null, enrollmentCount, moduleCount };
}

router.get("/catalog", async (_req, res) => {
  try {
    const courses = await db.select(courseShape).from(coursesTable)
      .leftJoin(usersTable, eq(coursesTable.instructorId, usersTable.id))
      .where(eq(coursesTable.status, "published"))
      .orderBy(desc(coursesTable.createdAt));

    const enrollmentCounts = await db.select({ courseId: enrollmentsTable.courseId, count: sql<number>`count(*)` })
      .from(enrollmentsTable).groupBy(enrollmentsTable.courseId);
    const enrollMap = Object.fromEntries(enrollmentCounts.map(e => [e.courseId, Number(e.count)]));

    const moduleCounts = await db.select({ courseId: sectionsTable.courseId, count: sql<number>`count(*)` })
      .from(sectionsTable).groupBy(sectionsTable.courseId);
    const moduleMap = Object.fromEntries(moduleCounts.map(s => [s.courseId, Number(s.count)]));

    res.json({ data: courses.map(c => formatCourse(c, enrollMap[c.id] ?? 0, moduleMap[c.id] ?? 0)), total: courses.length, page: 1, limit: 100 });
  } catch (err) {
    res.status(500).json({ error: "InternalError" });
  }
});

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const page = Number(req.query["page"] ?? 1);
    const limit = Number(req.query["limit"] ?? 20);
    const search = req.query["search"] as string | undefined;
    const status = req.query["status"] as string | undefined;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(eq(coursesTable.status, status as "draft" | "published" | "archived"));
    if (req.user!.role === "instructor") conditions.push(eq(coursesTable.instructorId, req.user!.userId));

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(coursesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const courses = await db.select(courseShape).from(coursesTable)
      .leftJoin(usersTable, eq(coursesTable.instructorId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit).offset(offset).orderBy(desc(coursesTable.createdAt));

    const enrollmentCounts = await db.select({ courseId: enrollmentsTable.courseId, count: sql<number>`count(*)` })
      .from(enrollmentsTable).groupBy(enrollmentsTable.courseId);
    const enrollMap = Object.fromEntries(enrollmentCounts.map(e => [e.courseId, Number(e.count)]));

    const moduleCounts = await db.select({ courseId: sectionsTable.courseId, count: sql<number>`count(*)` })
      .from(sectionsTable).groupBy(sectionsTable.courseId);
    const moduleMap = Object.fromEntries(moduleCounts.map(s => [s.courseId, Number(s.count)]));

    res.json({ data: courses.map(c => formatCourse(c, enrollMap[c.id] ?? 0, moduleMap[c.id] ?? 0)), total: Number(countResult?.count ?? 0), page, limit });
  } catch (err) {
    req.log.error({ err }, "List courses error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      longDescription: z.string().optional(),
      courseType: z.enum(["recorded", "live"]).optional().default("recorded"),
      thumbnailUrl: z.string().optional(),
      price: z.number().optional(),
    }).parse(req.body);
    const slug = uniqueSlug(data.title);

    const [course] = await db.insert(coursesTable).values({
      title: data.title, description: data.description, longDescription: data.longDescription,
      courseType: data.courseType, thumbnailUrl: data.thumbnailUrl,
      slug, price: data.price?.toString(), instructorId: req.user!.userId,
    }).returning();

    const [instructor] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);

    res.status(201).json(formatCourse({ ...course, instructorName: instructor?.name }, 0));
  } catch (err) {
    req.log.error({ err }, "Create course error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.get("/:courseId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [course] = await db.select(courseShape).from(coursesTable)
      .leftJoin(usersTable, eq(coursesTable.instructorId, usersTable.id))
      .where(eq(coursesTable.id, req.params["courseId"]!)).limit(1);

    if (!course) { res.status(404).json({ error: "NotFound" }); return; }

    const sections = await db.select().from(sectionsTable).where(eq(sectionsTable.courseId, course.id)).orderBy(sectionsTable.order);
    const sectionIds = sections.map(s => s.id);
    const lessons = sectionIds.length > 0
      ? await db.select().from(lessonsTable).where(inArray(lessonsTable.sectionId, sectionIds)).orderBy(lessonsTable.order)
      : [];

    const [{ count: enrollmentCount }] = await db.select({ count: sql<number>`count(*)` }).from(enrollmentsTable).where(eq(enrollmentsTable.courseId, course.id));

    const sectionsWithLessons = sections.map(s => ({ ...s, lessons: lessons.filter(l => l.sectionId === s.id) }));

    res.json({ ...formatCourse(course, Number(enrollmentCount)), sections: sectionsWithLessons });
  } catch (err) {
    req.log.error({ err }, "Get course error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.patch("/:courseId", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      longDescription: z.string().optional(),
      courseType: z.enum(["recorded", "live"]).optional(),
      thumbnailUrl: z.string().optional(),
      price: z.number().optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }).parse(req.body);

    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.price !== undefined) updateData["price"] = data.price.toString();

    const [updated] = await db.update(coursesTable).set(updateData).where(eq(coursesTable.id, req.params["courseId"]!)).returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }

    const [instructor] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.instructorId)).limit(1);
    res.json(formatCourse({ ...updated, instructorName: instructor?.name }, 0));
  } catch (err) {
    req.log.error({ err }, "Update course error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.delete("/:courseId", requireAuth, requireRole("owner"), async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(coursesTable).where(eq(coursesTable.id, req.params["courseId"]!));
    res.json({ message: "Course deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete course error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/:courseId/publish", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const [updated] = await db.update(coursesTable).set({ status: "published", updatedAt: new Date() }).where(eq(coursesTable.id, req.params["courseId"]!)).returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    const [instructor] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.instructorId)).limit(1);
    res.json(formatCourse({ ...updated, instructorName: instructor?.name }, 0));
  } catch (err) {
    req.log.error({ err }, "Publish course error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/:courseId/unpublish", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const [updated] = await db.update(coursesTable).set({ status: "draft", updatedAt: new Date() }).where(eq(coursesTable.id, req.params["courseId"]!)).returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    const [instructor] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, updated.instructorId)).limit(1);
    res.json(formatCourse({ ...updated, instructorName: instructor?.name }, 0));
  } catch (err) {
    req.log.error({ err }, "Unpublish course error");
    res.status(500).json({ error: "InternalError" });
  }
});

// SECTIONS
router.get("/:courseId/sections", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const sections = await db.select().from(sectionsTable).where(eq(sectionsTable.courseId, req.params["courseId"]!)).orderBy(sectionsTable.order);
    const sectionIds = sections.map(s => s.id);
    const lessons = sectionIds.length > 0
      ? await db.select().from(lessonsTable).where(inArray(lessonsTable.sectionId, sectionIds)).orderBy(lessonsTable.order)
      : [];
    res.json(sections.map(s => ({ ...s, lessons: lessons.filter(l => l.sectionId === s.id) })));
  } catch (err) {
    req.log.error({ err }, "List sections error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/:courseId/sections", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({ title: z.string().min(1), order: z.number().optional() }).parse(req.body);
    const [section] = await db.insert(sectionsTable).values({ ...data, courseId: req.params["courseId"]!, order: data.order ?? 0 }).returning();
    res.status(201).json(section);
  } catch (err) {
    req.log.error({ err }, "Create section error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.patch("/:courseId/sections/:sectionId", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({ title: z.string().optional(), order: z.number().optional() }).parse(req.body);
    const [updated] = await db.update(sectionsTable).set(data).where(and(eq(sectionsTable.id, req.params["sectionId"]!), eq(sectionsTable.courseId, req.params["courseId"]!))).returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update section error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.delete("/:courseId/sections/:sectionId", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(sectionsTable).where(and(eq(sectionsTable.id, req.params["sectionId"]!), eq(sectionsTable.courseId, req.params["courseId"]!)));
    res.json({ message: "Section deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete section error");
    res.status(500).json({ error: "InternalError" });
  }
});

function isValidLoomUrl(url: string | undefined): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.hostname === "www.loom.com" || u.hostname === "loom.com";
  } catch { return false; }
}

// LESSONS
router.post("/:courseId/sections/:sectionId/lessons", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({
      title: z.string().min(1),
      type: z.enum(["video", "text", "quiz", "live"]).optional().default("text"),
      content: z.string().optional(),
      videoUrl: z.string().optional(),
      pdfUrl: z.string().optional(),
      zoomMeetingUrl: z.string().optional(),
      zoomPassword: z.string().optional(),
      durationMinutes: z.number().optional(),
      order: z.number().optional(),
      isFree: z.boolean().optional(),
    }).parse(req.body);
    if (data.type === "video" && !isValidLoomUrl(data.videoUrl)) {
      res.status(400).json({ error: "ValidationError", message: "Video URL must be a valid Loom link (loom.com)" });
      return;
    }
    const [lesson] = await db.insert(lessonsTable).values({ ...data, sectionId: req.params["sectionId"]!, order: data.order ?? 0, isFree: data.isFree ?? false }).returning();
    res.status(201).json(lesson);
  } catch (err) {
    req.log.error({ err }, "Create lesson error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.get("/:courseId/sections/:sectionId/lessons/:lessonId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [lesson] = await db.select().from(lessonsTable).where(and(eq(lessonsTable.id, req.params["lessonId"]!), eq(lessonsTable.sectionId, req.params["sectionId"]!))).limit(1);
    if (!lesson) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(lesson);
  } catch (err) {
    req.log.error({ err }, "Get lesson error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.patch("/:courseId/sections/:sectionId/lessons/:lessonId", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({
      title: z.string().optional(),
      type: z.enum(["video", "text", "quiz", "live"]).optional(),
      content: z.string().optional(),
      videoUrl: z.string().optional(),
      pdfUrl: z.string().optional(),
      zoomMeetingUrl: z.string().optional(),
      zoomPassword: z.string().optional(),
      durationMinutes: z.number().optional(),
      order: z.number().optional(),
      isFree: z.boolean().optional(),
    }).parse(req.body);
    if (data.type === "video" && data.videoUrl !== undefined && !isValidLoomUrl(data.videoUrl)) {
      res.status(400).json({ error: "ValidationError", message: "Video URL must be a valid Loom link (loom.com)" });
      return;
    }
    const [updated] = await db.update(lessonsTable).set(data).where(and(eq(lessonsTable.id, req.params["lessonId"]!), eq(lessonsTable.sectionId, req.params["sectionId"]!))).returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update lesson error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.delete("/:courseId/sections/:sectionId/lessons/:lessonId", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(lessonsTable).where(and(eq(lessonsTable.id, req.params["lessonId"]!), eq(lessonsTable.sectionId, req.params["sectionId"]!)));
    res.json({ message: "Lesson deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete lesson error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
