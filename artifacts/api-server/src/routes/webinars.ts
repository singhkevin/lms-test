import { Router } from "express";
import { db } from "@workspace/db";
import { webinarsTable } from "@workspace/db";
import { eq, desc, gte, lt } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

const webinarSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  zoomUrl: z.string().url(),
  scheduledAt: z.string(),
  durationMinutes: z.number().int().positive().default(60),
  status: z.enum(["upcoming", "live", "ended", "cancelled"]).default("upcoming"),
});

// List webinars
router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const filter = req.query["filter"] as string | undefined;
    const now = new Date();

    let rows;
    if (filter === "upcoming") {
      rows = await db.select().from(webinarsTable)
        .where(gte(webinarsTable.scheduledAt, now))
        .orderBy(webinarsTable.scheduledAt);
    } else if (filter === "past") {
      rows = await db.select().from(webinarsTable)
        .where(lt(webinarsTable.scheduledAt, now))
        .orderBy(desc(webinarsTable.scheduledAt));
    } else {
      rows = await db.select().from(webinarsTable)
        .orderBy(desc(webinarsTable.scheduledAt));
    }

    res.json({ data: rows });
  } catch (err) {
    req.log.error({ err }, "List webinars error");
    res.status(500).json({ error: "InternalError" });
  }
});

// Create webinar
router.post("/", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = webinarSchema.parse(req.body);
    const [webinar] = await db.insert(webinarsTable).values({
      ...data,
      scheduledAt: new Date(data.scheduledAt),
    }).returning();
    res.status(201).json(webinar);
  } catch (err) {
    req.log.error({ err }, "Create webinar error");
    res.status(500).json({ error: "InternalError" });
  }
});

// Get webinar
router.get("/:webinarId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [webinar] = await db.select().from(webinarsTable)
      .where(eq(webinarsTable.id, req.params["webinarId"]!)).limit(1);
    if (!webinar) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(webinar);
  } catch (err) {
    req.log.error({ err }, "Get webinar error");
    res.status(500).json({ error: "InternalError" });
  }
});

// Update webinar
router.patch("/:webinarId", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = webinarSchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = { ...data };
    if (data.scheduledAt) updateData["scheduledAt"] = new Date(data.scheduledAt);

    const [updated] = await db.update(webinarsTable)
      .set(updateData)
      .where(eq(webinarsTable.id, req.params["webinarId"]!))
      .returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update webinar error");
    res.status(500).json({ error: "InternalError" });
  }
});

// Delete webinar
router.delete("/:webinarId", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(webinarsTable).where(eq(webinarsTable.id, req.params["webinarId"]!));
    res.json({ message: "Webinar deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete webinar error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
