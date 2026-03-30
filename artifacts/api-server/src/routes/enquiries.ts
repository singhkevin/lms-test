import { Router } from "express";
import { db, courseEnquiriesTable, coursesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../lib/auth.js";

const router = Router();

// List all enquiries (admin/instructor only)
router.get("/", requireAuth, requireRole("owner", "instructor"), async (req: AuthenticatedRequest, res) => {
  try {
    const page = Number(req.query["page"] ?? 1);
    const limit = Number(req.query["limit"] ?? 50);
    const offset = (page - 1) * limit;

    const enquiries = await db
      .select({
        id: courseEnquiriesTable.id,
        courseId: courseEnquiriesTable.courseId,
        courseName: coursesTable.title,
        userId: courseEnquiriesTable.userId,
        firstName: courseEnquiriesTable.firstName,
        lastName: courseEnquiriesTable.lastName,
        email: courseEnquiriesTable.email,
        phone: courseEnquiriesTable.phone,
        age: courseEnquiriesTable.age,
        upscAttempts: courseEnquiriesTable.upscAttempts,
        createdAt: courseEnquiriesTable.createdAt,
      })
      .from(courseEnquiriesTable)
      .leftJoin(coursesTable, eq(courseEnquiriesTable.courseId, coursesTable.id))
      .orderBy(desc(courseEnquiriesTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data: enquiries, page, limit });
  } catch (err) {
    req.log.error({ err }, "List enquiries error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
