import { Router } from "express";
import { db, usersTable, coursesTable, enrollmentsTable, ordersTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth.js";

const router = Router();

router.get("/summary", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const [[totalUsers], [totalStudents], [totalInstructors], [totalCourses], [publishedCourses], [totalEnrollments], [activeEnrollments], [orderStats], recentEnrollments, recentOrders] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(usersTable),
      db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "student")),
      db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "instructor")),
      db.select({ count: sql<number>`count(*)` }).from(coursesTable),
      db.select({ count: sql<number>`count(*)` }).from(coursesTable).where(eq(coursesTable.status, "published")),
      db.select({ count: sql<number>`count(*)` }).from(enrollmentsTable),
      db.select({ count: sql<number>`count(*)` }).from(enrollmentsTable).where(eq(enrollmentsTable.status, "active")),
      db.select({ count: sql<number>`count(*)`, revenue: sql<number>`coalesce(sum(amount), 0)` }).from(ordersTable).where(eq(ordersTable.status, "paid")),
      db.select({
        id: enrollmentsTable.id, userId: enrollmentsTable.userId, courseId: enrollmentsTable.courseId,
        courseName: coursesTable.title, userName: usersTable.name,
        status: enrollmentsTable.status, enrolledAt: enrollmentsTable.enrolledAt, expiresAt: enrollmentsTable.expiresAt,
      }).from(enrollmentsTable)
        .leftJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
        .leftJoin(usersTable, eq(enrollmentsTable.userId, usersTable.id))
        .orderBy(desc(enrollmentsTable.enrolledAt)).limit(5),
      db.select({
        id: ordersTable.id, userId: ordersTable.userId, courseId: ordersTable.courseId,
        courseName: coursesTable.title, userName: usersTable.name,
        amount: ordersTable.amount, currency: ordersTable.currency, status: ordersTable.status,
        paymentGateway: ordersTable.paymentGateway, gatewayOrderId: ordersTable.gatewayOrderId,
        affiliateCode: ordersTable.affiliateCode, createdAt: ordersTable.createdAt, paidAt: ordersTable.paidAt,
      }).from(ordersTable)
        .leftJoin(coursesTable, eq(ordersTable.courseId, coursesTable.id))
        .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
        .orderBy(desc(ordersTable.createdAt)).limit(5),
    ]);

    res.json({
      totalUsers: Number(totalUsers?.count ?? 0),
      totalStudents: Number(totalStudents?.count ?? 0),
      totalInstructors: Number(totalInstructors?.count ?? 0),
      totalCourses: Number(totalCourses?.count ?? 0),
      publishedCourses: Number(publishedCourses?.count ?? 0),
      totalEnrollments: Number(totalEnrollments?.count ?? 0),
      activeEnrollments: Number(activeEnrollments?.count ?? 0),
      totalOrders: Number(orderStats?.count ?? 0),
      totalRevenue: Number(orderStats?.revenue ?? 0),
      recentEnrollments,
      recentOrders: recentOrders.map(o => ({ ...o, amount: Number(o.amount) })),
    });
  } catch (err) {
    req.log.error({ err }, "Analytics error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
