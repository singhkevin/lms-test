import { Router } from "express";
import { db, enrollmentsTable, coursesTable, usersTable } from "@workspace/db";
import { eq, and, sql, or, ilike } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth.js";
import { sendEnrollmentConfirmation } from "../lib/email.js";
import { z } from "zod";

const router = Router();

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const page = Number(req.query["page"] ?? 1);
    const limit = Number(req.query["limit"] ?? 20);
    const offset = (page - 1) * limit;
    const courseId = req.query["courseId"] as string | undefined;
    const userId = req.query["userId"] as string | undefined;
    const status = req.query["status"] as string | undefined;
    const search = req.query["search"] as string | undefined;

    const conditions = [];
    if (req.user!.role === "student") conditions.push(eq(enrollmentsTable.userId, req.user!.userId));
    else if (userId) conditions.push(eq(enrollmentsTable.userId, userId));
    if (courseId) conditions.push(eq(enrollmentsTable.courseId, courseId));
    if (status) conditions.push(eq(enrollmentsTable.status, status as "active" | "revoked" | "expired"));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = db.select({
      id: enrollmentsTable.id, userId: enrollmentsTable.userId, courseId: enrollmentsTable.courseId,
      courseName: coursesTable.title, userName: usersTable.name, userEmail: usersTable.email,
      status: enrollmentsTable.status, enrolledAt: enrollmentsTable.enrolledAt, expiresAt: enrollmentsTable.expiresAt,
    }).from(enrollmentsTable)
      .leftJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
      .leftJoin(usersTable, eq(enrollmentsTable.userId, usersTable.id));

    const searchCondition = search
      ? or(ilike(usersTable.email, `%${search}%`), ilike(usersTable.name, `%${search}%`))
      : undefined;

    const finalWhere = whereClause && searchCondition
      ? and(whereClause, searchCondition)
      : whereClause ?? searchCondition;

    // Count using the same join + where
    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(enrollmentsTable)
      .leftJoin(usersTable, eq(enrollmentsTable.userId, usersTable.id))
      .where(finalWhere);

    const enrollments = await baseQuery.where(finalWhere).limit(limit).offset(offset);

    res.json({ data: enrollments, total: Number(countResult?.count ?? 0), page, limit });
  } catch (err) {
    req.log.error({ err }, "List enrollments error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({ userId: z.string(), courseId: z.string(), expiresAt: z.string().optional() }).parse(req.body);

    const existing = await db.select({ id: enrollmentsTable.id }).from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.userId, data.userId), eq(enrollmentsTable.courseId, data.courseId), eq(enrollmentsTable.status, "active"))).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Conflict", message: "User is already enrolled in this course" });
      return;
    }

    const [enrollment] = await db.insert(enrollmentsTable).values({
      userId: data.userId, courseId: data.courseId,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    }).returning();

    // Send email notification
    const [[user], [course]] = await Promise.all([
      db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, data.userId)).limit(1),
      db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, data.courseId)).limit(1),
    ]);
    if (user && course) sendEnrollmentConfirmation(user.email, user.name, course.title).catch(() => {});

    res.status(201).json({ ...enrollment, courseName: course?.title, userName: user?.name });
  } catch (err) {
    req.log.error({ err }, "Create enrollment error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.get("/:enrollmentId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [enrollment] = await db.select({
      id: enrollmentsTable.id, userId: enrollmentsTable.userId, courseId: enrollmentsTable.courseId,
      courseName: coursesTable.title, userName: usersTable.name,
      status: enrollmentsTable.status, enrolledAt: enrollmentsTable.enrolledAt, expiresAt: enrollmentsTable.expiresAt,
    }).from(enrollmentsTable)
      .leftJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
      .leftJoin(usersTable, eq(enrollmentsTable.userId, usersTable.id))
      .where(eq(enrollmentsTable.id, req.params["enrollmentId"]!)).limit(1);
    if (!enrollment) { res.status(404).json({ error: "NotFound" }); return; }
    res.json(enrollment);
  } catch (err) {
    req.log.error({ err }, "Get enrollment error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.delete("/:enrollmentId", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    await db.update(enrollmentsTable).set({ status: "revoked" }).where(eq(enrollmentsTable.id, req.params["enrollmentId"]!));
    res.json({ message: "Enrollment revoked" });
  } catch (err) {
    req.log.error({ err }, "Revoke enrollment error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
