import { Router } from "express";
import { db, communityPostsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../lib/auth.js";
import { z } from "zod";

const router = Router();

router.get("/posts", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const page = Number(req.query["page"] ?? 1);
    const limit = Number(req.query["limit"] ?? 20);
    const offset = (page - 1) * limit;
    const courseId = req.query["courseId"] as string | undefined;

    const conditions = courseId ? [eq(communityPostsTable.courseId, courseId)] : [];
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(communityPostsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const posts = await db.select({
      id: communityPostsTable.id, courseId: communityPostsTable.courseId,
      authorId: communityPostsTable.authorId, authorName: usersTable.name,
      authorAvatarUrl: usersTable.avatarUrl, content: communityPostsTable.content,
      createdAt: communityPostsTable.createdAt,
    }).from(communityPostsTable)
      .leftJoin(usersTable, eq(communityPostsTable.authorId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit).offset(offset);

    res.json({ data: posts, total: Number(countResult?.count ?? 0), page, limit });
  } catch (err) {
    req.log.error({ err }, "List community posts error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/posts", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const data = z.object({ courseId: z.string().optional(), content: z.string().min(1) }).parse(req.body);
    const [post] = await db.insert(communityPostsTable).values({ ...data, authorId: req.user!.userId }).returning();
    const [user] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl }).from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    res.status(201).json({ ...post, authorName: user?.name, authorAvatarUrl: user?.avatarUrl });
  } catch (err) {
    req.log.error({ err }, "Create community post error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.delete("/posts/:postId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [post] = await db.select().from(communityPostsTable).where(eq(communityPostsTable.id, req.params["postId"]!)).limit(1);
    if (!post) { res.status(404).json({ error: "NotFound" }); return; }

    if (post.authorId !== req.user!.userId && !["owner", "instructor"].includes(req.user!.role)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    await db.delete(communityPostsTable).where(eq(communityPostsTable.id, req.params["postId"]!));
    res.json({ message: "Post deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete post error");
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
