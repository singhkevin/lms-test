import { Router } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth.js";
import { z } from "zod";
import { eq } from "drizzle-orm";

const router = Router();

async function getOrCreateSettings() {
  const [existing] = await db.select().from(siteSettingsTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(siteSettingsTable).values({}).returning();
  return created;
}

router.get("/", async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "InternalError" });
  }
});

router.patch("/", requireAuth, requireRole("owner"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({
      siteTitle: z.string().min(1).max(200).optional(),
      logoUrl: z.string().url().nullable().optional(),
      faviconUrl: z.string().url().nullable().optional(),
      socialShareImageUrl: z.string().url().nullable().optional(),
    }).parse(req.body);

    const settings = await getOrCreateSettings();
    const [updated] = await db
      .update(siteSettingsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(siteSettingsTable.id, settings.id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log?.error({ err }, "Update site settings error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
