import { Router } from "express";
import { db, affiliatesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

router.get("/", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const affiliates = await db.select({
      id: affiliatesTable.id, userId: affiliatesTable.userId, userName: usersTable.name,
      code: affiliatesTable.code, totalReferrals: affiliatesTable.totalReferrals,
      totalRevenue: affiliatesTable.totalRevenue, createdAt: affiliatesTable.createdAt,
    }).from(affiliatesTable)
      .leftJoin(usersTable, eq(affiliatesTable.userId, usersTable.id));

    res.json(affiliates.map(a => ({ ...a, totalRevenue: Number(a.totalRevenue) })));
  } catch (err) {
    req.log.error({ err }, "List affiliates error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/", requireAuth, requireRole("owner"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({ userId: z.string(), code: z.string().optional() }).parse(req.body);
    const code = data.code || data.userId.slice(0, 8).toUpperCase();

    const [affiliate] = await db.insert(affiliatesTable).values({ userId: data.userId, code }).returning();
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, data.userId)).limit(1);

    res.status(201).json({ ...affiliate, totalRevenue: Number(affiliate.totalRevenue), userName: user?.name });
  } catch (err) {
    req.log.error({ err }, "Create affiliate error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
