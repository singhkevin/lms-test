import { Router } from "express";
import { db, liveSessionsTable, coursesTable, usersTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const courseId = req.query["courseId"] as string | undefined;
    const upcoming = req.query["upcoming"] === "true";

    const conditions = [];
    if (courseId) conditions.push(eq(liveSessionsTable.courseId, courseId));
    if (upcoming) conditions.push(gte(liveSessionsTable.scheduledAt, new Date()));

    const sessions = await db.select({
      id: liveSessionsTable.id, courseId: liveSessionsTable.courseId, courseName: coursesTable.title,
      title: liveSessionsTable.title, description: liveSessionsTable.description,
      scheduledAt: liveSessionsTable.scheduledAt, durationMinutes: liveSessionsTable.durationMinutes,
      meetingUrl: liveSessionsTable.meetingUrl, meetingId: liveSessionsTable.meetingId,
      instructorId: liveSessionsTable.instructorId, instructorName: usersTable.name,
      createdAt: liveSessionsTable.createdAt,
    }).from(liveSessionsTable)
      .leftJoin(coursesTable, eq(liveSessionsTable.courseId, coursesTable.id))
      .leftJoin(usersTable, eq(liveSessionsTable.instructorId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json(sessions);
  } catch (err) {
    req.log.error({ err }, "List live sessions error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({
      courseId: z.string(), title: z.string().min(1), description: z.string().optional(),
      scheduledAt: z.string(), durationMinutes: z.number().int().positive(),
      meetingUrl: z.string().optional(), meetingId: z.string().optional(),
    }).parse(req.body);

    const [session] = await db.insert(liveSessionsTable).values({
      ...data, scheduledAt: new Date(data.scheduledAt), instructorId: req.user!.userId,
    }).returning();

    const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, data.courseId)).limit(1);
    const [instructor] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);

    res.status(201).json({ ...session, courseName: course?.title, instructorName: instructor?.name });
  } catch (err) {
    req.log.error({ err }, "Create live session error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.get("/:sessionId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [session] = await db.select({
      id: liveSessionsTable.id, courseId: liveSessionsTable.courseId, courseName: coursesTable.title,
      title: liveSessionsTable.title, description: liveSessionsTable.description,
      scheduledAt: liveSessionsTable.scheduledAt, durationMinutes: liveSessionsTable.durationMinutes,
      meetingUrl: liveSessionsTable.meetingUrl, meetingId: liveSessionsTable.meetingId,
      instructorId: liveSessionsTable.instructorId, instructorName: usersTable.name,
      createdAt: liveSessionsTable.createdAt,
    }).from(liveSessionsTable)
      .leftJoin(coursesTable, eq(liveSessionsTable.courseId, coursesTable.id))
      .leftJoin(usersTable, eq(liveSessionsTable.instructorId, usersTable.id))
      .where(eq(liveSessionsTable.id, req.params["sessionId"]!)).limit(1);
    if (!session) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(session);
  } catch (err) {
    req.log.error({ err }, "Get live session error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.patch("/:sessionId", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({
      title: z.string().optional(), description: z.string().optional(),
      scheduledAt: z.string().optional(), durationMinutes: z.number().optional(),
      meetingUrl: z.string().optional(), meetingId: z.string().optional(),
    }).parse(req.body);

    const updateData: Record<string, unknown> = { ...data };
    if (data.scheduledAt) updateData["scheduledAt"] = new Date(data.scheduledAt);

    const [updated] = await db.update(liveSessionsTable).set(updateData).where(eq(liveSessionsTable.id, req.params["sessionId"]!)).returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    res.json({ ...updated, courseName: null, instructorName: null });
  } catch (err) {
    req.log.error({ err }, "Update live session error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.delete("/:sessionId", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(liveSessionsTable).where(eq(liveSessionsTable.id, req.params["sessionId"]!));
    res.json({ message: "Live session cancelled" });
  } catch (err) {
    req.log.error({ err }, "Delete live session error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
