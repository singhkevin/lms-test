import { Router } from "express";
import { db, usersTable, enrollmentsTable, ordersTable, coursesTable } from "@workspace/db";
import { eq, ilike, and, or, sql } from "drizzle-orm";
import { requireAuth, requireRole, hashPassword, type AuthenticatedRequest } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

router.get("/", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const page = Number(req.query["page"] ?? 1);
    const limit = Number(req.query["limit"] ?? 20);
    const search = req.query["search"] as string | undefined;
    const role = req.query["role"] as string | undefined;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) conditions.push(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`)));
    if (role) conditions.push(eq(usersTable.role, role as "owner" | "instructor" | "student"));

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const users = await db.select().from(usersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit).offset(offset).orderBy(usersTable.createdAt);

    res.json({
      data: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl, createdAt: u.createdAt })),
      total: Number(countResult?.count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    req.log.error({ err }, "List users error");
    res.status(500).json({ error: "InternalError" });
  }
});

// Admin create user
router.post("/", requireAuth, requireRole("owner"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(["instructor", "student"]).optional().default("student"),
    }).parse(req.body);

    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, data.email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Conflict", message: "Email already in use" });
      return;
    }

    const passwordHash = await hashPassword(data.password);
    const [user] = await db.insert(usersTable).values({ name: data.name, email: data.email, passwordHash, role: data.role }).returning();
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl, createdAt: user.createdAt });
  } catch (err) {
    req.log.error({ err }, "Create user error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.get("/:userId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    if (req.user!.role === "student" && req.user!.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "NotFound", message: "User not found" }); return; }

    const enrollments = await db.select({
      id: enrollmentsTable.id,
      userId: enrollmentsTable.userId,
      courseId: enrollmentsTable.courseId,
      courseName: coursesTable.title,
      status: enrollmentsTable.status,
      enrolledAt: enrollmentsTable.enrolledAt,
      expiresAt: enrollmentsTable.expiresAt,
    }).from(enrollmentsTable)
      .leftJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
      .where(eq(enrollmentsTable.userId, userId));

    const orders = await db.select({
      id: ordersTable.id,
      userId: ordersTable.userId,
      courseId: ordersTable.courseId,
      courseName: coursesTable.title,
      amount: ordersTable.amount,
      currency: ordersTable.currency,
      status: ordersTable.status,
      paymentGateway: ordersTable.paymentGateway,
      gatewayOrderId: ordersTable.gatewayOrderId,
      affiliateCode: ordersTable.affiliateCode,
      createdAt: ordersTable.createdAt,
      paidAt: ordersTable.paidAt,
    }).from(ordersTable)
      .leftJoin(coursesTable, eq(ordersTable.courseId, coursesTable.id))
      .where(eq(ordersTable.userId, userId));

    res.json({
      id: user.id, name: user.name, email: user.email, role: user.role,
      avatarUrl: user.avatarUrl, createdAt: user.createdAt,
      enrollments: enrollments.map(e => ({ ...e, userName: user.name })),
      orders: orders.map(o => ({ ...o, userName: user.name, amount: Number(o.amount) })),
    });
  } catch (err) {
    req.log.error({ err }, "Get user error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.patch("/:userId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    if (req.user!.role === "student" && req.user!.userId !== userId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const data = z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(["owner", "instructor", "student"]).optional(),
      avatarUrl: z.string().optional(),
    }).parse(req.body);

    if (data.role && req.user!.role !== "owner") {
      res.status(403).json({ error: "Forbidden", message: "Only owners can change roles" }); return;
    }

    const [updated] = await db.update(usersTable).set({ ...data, updatedAt: new Date() }).where(eq(usersTable.id, userId)).returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }

    res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, avatarUrl: updated.avatarUrl, createdAt: updated.createdAt });
  } catch (err) {
    req.log.error({ err }, "Update user error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.delete("/:userId", requireAuth, requireRole("owner"), async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, req.params["userId"]!));
    res.json({ message: "User deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete user error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.patch("/:userId/password", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    if (req.user!.role === "student" && req.user!.userId !== userId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const { newPassword } = z.object({ newPassword: z.string().min(8) }).parse(req.body);
    const passwordHash = await hashPassword(newPassword);
    await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, userId));
    res.json({ message: "Password updated" });
  } catch (err) {
    req.log.error({ err }, "Change password error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
