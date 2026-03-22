import { Router } from "express";
import { db, ordersTable, enrollmentsTable, coursesTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth.js";
import { sendEnrollmentConfirmation } from "../lib/email.js";
import { z } from "zod";

const router = Router();

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const page = Number(req.query["page"] ?? 1);
    const limit = Number(req.query["limit"] ?? 20);
    const offset = (page - 1) * limit;
    const userId = req.query["userId"] as string | undefined;
    const status = req.query["status"] as string | undefined;

    const conditions = [];
    if (req.user!.role === "student") conditions.push(eq(ordersTable.userId, req.user!.userId));
    else if (userId) conditions.push(eq(ordersTable.userId, userId));
    if (status) conditions.push(eq(ordersTable.status, status as "pending" | "paid" | "failed" | "refunded"));

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(ordersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const orders = await db.select({
      id: ordersTable.id, userId: ordersTable.userId, courseId: ordersTable.courseId,
      courseName: coursesTable.title, userName: usersTable.name,
      amount: ordersTable.amount, currency: ordersTable.currency, status: ordersTable.status,
      paymentGateway: ordersTable.paymentGateway, gatewayOrderId: ordersTable.gatewayOrderId,
      affiliateCode: ordersTable.affiliateCode, createdAt: ordersTable.createdAt, paidAt: ordersTable.paidAt,
    }).from(ordersTable)
      .leftJoin(coursesTable, eq(ordersTable.courseId, coursesTable.id))
      .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit).offset(offset);

    res.json({ data: orders.map(o => ({ ...o, amount: Number(o.amount) })), total: Number(countResult?.count ?? 0), page, limit });
  } catch (err) {
    req.log.error({ err }, "List orders error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({ courseId: z.string(), amount: z.number(), currency: z.string().optional().default("INR"), affiliateCode: z.string().optional() }).parse(req.body);
    const [order] = await db.insert(ordersTable).values({ ...data, userId: req.user!.userId, amount: data.amount.toString() }).returning();
    const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, data.courseId)).limit(1);
    res.status(201).json({ ...order, amount: Number(order.amount), courseName: course?.title, userName: null });
  } catch (err) {
    req.log.error({ err }, "Create order error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.get("/:orderId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [order] = await db.select({
      id: ordersTable.id, userId: ordersTable.userId, courseId: ordersTable.courseId,
      courseName: coursesTable.title, userName: usersTable.name,
      amount: ordersTable.amount, currency: ordersTable.currency, status: ordersTable.status,
      paymentGateway: ordersTable.paymentGateway, gatewayOrderId: ordersTable.gatewayOrderId,
      affiliateCode: ordersTable.affiliateCode, createdAt: ordersTable.createdAt, paidAt: ordersTable.paidAt,
    }).from(ordersTable)
      .leftJoin(coursesTable, eq(ordersTable.courseId, coursesTable.id))
      .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(eq(ordersTable.id, req.params["orderId"]!)).limit(1);
    if (!order) { res.status(404).json({ error: "NotFound" }); return; }
    res.json({ ...order, amount: Number(order.amount) });
  } catch (err) {
    req.log.error({ err }, "Get order error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.patch("/:orderId", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = z.object({ status: z.enum(["pending", "paid", "failed", "refunded"]) }).parse(req.body);
    const [updated] = await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, req.params["orderId"]!)).returning();
    if (!updated) { res.status(404).json({ error: "NotFound" }); return; }
    const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, updated.courseId)).limit(1);
    res.json({ ...updated, amount: Number(updated.amount), courseName: course?.title, userName: null });
  } catch (err) {
    req.log.error({ err }, "Update order error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/:orderId/mark-paid", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const paidAt = new Date();
    const [order] = await db.update(ordersTable).set({ status: "paid", paidAt }).where(eq(ordersTable.id, req.params["orderId"]!)).returning();
    if (!order) { res.status(404).json({ error: "NotFound" }); return; }

    // Auto-enroll
    const existing = await db.select({ id: enrollmentsTable.id }).from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, order.userId), eq(enrollmentsTable.courseId, order.courseId), eq(enrollmentsTable.status, "active"))).limit(1);

    let enrollment;
    if (existing.length === 0) {
      const [newEnrollment] = await db.insert(enrollmentsTable).values({ userId: order.userId, courseId: order.courseId }).returning();
      enrollment = newEnrollment;

      const [[user], [course]] = await Promise.all([
        db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, order.userId)).limit(1),
        db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, order.courseId)).limit(1),
      ]);
      if (user && course) sendEnrollmentConfirmation(user.email, user.name, course.title).catch(() => {});
    } else {
      enrollment = existing[0];
    }

    const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, order.courseId)).limit(1);
    res.json({
      order: { ...order, amount: Number(order.amount), courseName: course?.title, userName: null },
      enrollment: { ...enrollment, courseName: course?.title, userName: null },
    });
  } catch (err) {
    req.log.error({ err }, "Mark paid error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
