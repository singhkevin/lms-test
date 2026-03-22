import { Router } from "express";
import { db, progressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const courseId = req.query["courseId"] as string | undefined;
    const conditions = [eq(progressTable.userId, req.user!.userId)];
    if (courseId) conditions.push(eq(progressTable.courseId, courseId));
    const records = await db.select().from(progressTable).where(and(...conditions));
    res.json(records);
  } catch (err) {
    req.log.error({ err }, "Get progress error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/lesson/:lessonId/complete", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { courseId } = z.object({ courseId: z.string() }).parse(req.body);
    const { lessonId } = req.params;

    const existing = await db.select().from(progressTable)
      .where(and(eq(progressTable.userId, req.user!.userId), eq(progressTable.lessonId, lessonId!))).limit(1);

    if (existing.length > 0) {
      res.json(existing[0]);
      return;
    }

    const [progress] = await db.insert(progressTable).values({
      userId: req.user!.userId,
      lessonId: lessonId!,
      courseId,
    }).returning();

    res.json(progress);
  } catch (err) {
    req.log.error({ err }, "Mark lesson complete error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
