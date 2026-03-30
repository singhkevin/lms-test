import { Router } from "express";
import { db } from "@workspace/db";
import { webinarsTable, webinarRsvpsTable, usersTable } from "@workspace/db";
import { eq, desc, gte, lt, and, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

const webinarSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  zoomUrl: z.string().url(),
  scheduledAt: z.string(),
  durationMinutes: z.number().int().positive().default(60),
  status: z.enum(["upcoming", "live", "ended", "cancelled"]).default("upcoming"),
});

// Helper: get rsvp count for a list of webinar ids
async function getRsvpCounts(webinarIds: string[]): Promise<Record<string, number>> {
  if (webinarIds.length === 0) return {};
  const rows = await db
    .select({ webinarId: webinarRsvpsTable.webinarId, count: sql<number>`count(*)::int` })
    .from(webinarRsvpsTable)
    .where(sql`${webinarRsvpsTable.webinarId} = ANY(${webinarIds})`)
    .groupBy(webinarRsvpsTable.webinarId);
  return Object.fromEntries(rows.map(r => [r.webinarId, r.count]));
}

// Helper: check if user has rsvp'd a list of webinars
async function getUserRsvps(userId: string, webinarIds: string[]): Promise<Set<string>> {
  if (webinarIds.length === 0) return new Set();
  const rows = await db
    .select({ webinarId: webinarRsvpsTable.webinarId })
    .from(webinarRsvpsTable)
    .where(and(eq(webinarRsvpsTable.userId, userId), sql`${webinarRsvpsTable.webinarId} = ANY(${webinarIds})`));
  return new Set(rows.map(r => r.webinarId));
}

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

    const ids = rows.map(r => r.id);
    const counts = await getRsvpCounts(ids);
    const userRsvps = req.user ? await getUserRsvps(req.user.userId, ids) : new Set<string>();

    const data = rows.map(r => ({
      ...r,
      rsvpCount: counts[r.id] ?? 0,
      hasRsvped: userRsvps.has(r.id),
    }));

    res.json({ data });
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
      imageUrl: data.imageUrl || null,
      scheduledAt: new Date(data.scheduledAt),
    }).returning();
    res.status(201).json({ ...webinar, rsvpCount: 0, hasRsvped: false });
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

    const counts = await getRsvpCounts([webinar.id]);
    const userRsvps = req.user ? await getUserRsvps(req.user.userId, [webinar.id]) : new Set<string>();

    res.json({ ...webinar, rsvpCount: counts[webinar.id] ?? 0, hasRsvped: userRsvps.has(webinar.id) });
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
    if ("imageUrl" in data) updateData["imageUrl"] = data.imageUrl || null;

    const [updated] = await db.update(webinarsTable)
      .set(updateData)
      .where(eq(webinarsTable.id, req.params["webinarId"]!))
      .returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }

    const counts = await getRsvpCounts([updated.id]);
    const userRsvps = req.user ? await getUserRsvps(req.user.userId, [updated.id]) : new Set<string>();

    res.json({ ...updated, rsvpCount: counts[updated.id] ?? 0, hasRsvped: userRsvps.has(updated.id) });
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

// RSVP: student signs up
router.post("/:webinarId/rsvp", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const webinarId = req.params["webinarId"]!;
    const userId = req.user!.userId;

    const [existing] = await db.select({ id: webinarRsvpsTable.id })
      .from(webinarRsvpsTable)
      .where(and(eq(webinarRsvpsTable.webinarId, webinarId), eq(webinarRsvpsTable.userId, userId)))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Conflict", message: "Already RSVP'd to this webinar" });
      return;
    }

    await db.insert(webinarRsvpsTable).values({ webinarId, userId });

    const counts = await getRsvpCounts([webinarId]);
    res.status(201).json({ message: "RSVP confirmed", rsvpCount: counts[webinarId] ?? 1 });
  } catch (err) {
    req.log.error({ err }, "RSVP error");
    res.status(500).json({ error: "InternalError" });
  }
});

// RSVP: student cancels
router.delete("/:webinarId/rsvp", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const webinarId = req.params["webinarId"]!;
    const userId = req.user!.userId;

    await db.delete(webinarRsvpsTable)
      .where(and(eq(webinarRsvpsTable.webinarId, webinarId), eq(webinarRsvpsTable.userId, userId)));

    const counts = await getRsvpCounts([webinarId]);
    res.json({ message: "RSVP cancelled", rsvpCount: counts[webinarId] ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Cancel RSVP error");
    res.status(500).json({ error: "InternalError" });
  }
});

// Get RSVPs for a webinar (admin/instructor only)
router.get("/:webinarId/rsvps", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const webinarId = req.params["webinarId"]!;

    const rsvps = await db
      .select({
        id: webinarRsvpsTable.id,
        userId: webinarRsvpsTable.userId,
        userName: usersTable.name,
        userEmail: usersTable.email,
        createdAt: webinarRsvpsTable.createdAt,
      })
      .from(webinarRsvpsTable)
      .leftJoin(usersTable, eq(webinarRsvpsTable.userId, usersTable.id))
      .where(eq(webinarRsvpsTable.webinarId, webinarId))
      .orderBy(desc(webinarRsvpsTable.createdAt));

    res.json({ data: rsvps, count: rsvps.length });
  } catch (err) {
    req.log.error({ err }, "Get RSVPs error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
