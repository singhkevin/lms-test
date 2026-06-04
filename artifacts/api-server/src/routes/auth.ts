import { Router } from "express";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { signToken, hashPassword, comparePassword, requireAuth, type AuthenticatedRequest } from "../lib/auth.js";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../lib/email.js";
import { z } from "zod";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["owner", "instructor", "student"]).optional().default("student"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, data.email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Conflict", message: "Email already in use" });
      return;
    }

    const passwordHash = await hashPassword(data.password);
    const [user] = await db.insert(usersTable).values({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    }).returning();

    sendWelcomeEmail(user.email, user.name).catch(() => {});

    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "ValidationError", message: err.message });
      return;
    }
    req.log.error({ err }, "Register error");
    const causeMessage = err?.cause?.message || err?.cause || "";
    res.status(500).json({ 
      error: "InternalError", 
      message: `Registration failed: ${err?.message || String(err)}${causeMessage ? ` (Cause: ${causeMessage})` : ""}` 
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, data.email)).limit(1);
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    const valid = await comparePassword(data.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "ValidationError", message: err.message });
      return;
    }
    req.log.error({ err }, "Login error");
    const causeMessage = err?.cause?.message || err?.cause || "";
    res.status(500).json({ 
      error: "InternalError", 
      message: `Login failed: ${err?.message || String(err)}${causeMessage ? ` (Cause: ${causeMessage})` : ""}` 
    });
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (user) {
      const token = crypto.randomUUID() + "-" + crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(passwordResetTokensTable).values({
        userId: user.id,
        token,
        expiresAt,
      });

      const baseUrl = process.env["APP_URL"] || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      sendPasswordResetEmail(user.email, user.name, resetUrl).catch(() => {});
    }

    res.json({ message: "If an account with that email exists, a reset link has been sent." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "ValidationError", message: err.message });
      return;
    }
    req.log.error({ err }, "Forgot password error");
    res.status(500).json({ error: "InternalError" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = z.object({ token: z.string(), password: z.string().min(8) }).parse(req.body);

    const now = new Date();
    const [resetToken] = await db.select().from(passwordResetTokensTable)
      .where(and(
        eq(passwordResetTokensTable.token, token),
        gt(passwordResetTokensTable.expiresAt, now),
      )).limit(1);

    if (!resetToken || resetToken.usedAt) {
      res.status(400).json({ error: "InvalidToken", message: "Token is invalid or expired" });
      return;
    }

    const passwordHash = await hashPassword(password);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, resetToken.userId));
    await db.update(passwordResetTokensTable).set({ usedAt: now }).where(eq(passwordResetTokensTable.id, resetToken.id));

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "ValidationError", message: err.message });
      return;
    }
    req.log.error({ err }, "Reset password error");
    res.status(500).json({ error: "InternalError" });
  }
});

// One-time setup endpoint — creates the first owner account if no users exist.
// Requires SETUP_TOKEN env variable to be set, and the request must supply it.
router.post("/setup", async (req, res) => {
  const setupToken = process.env["SETUP_TOKEN"];
  if (!setupToken) {
    res.status(403).json({ error: "Forbidden", message: "Setup is disabled. Set SETUP_TOKEN env variable to enable." });
    return;
  }
  try {
    const data = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      setupToken: z.string(),
    }).parse(req.body);
    if (data.setupToken !== setupToken) {
      res.status(403).json({ error: "Forbidden", message: "Invalid setup token." });
      return;
    }
    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
    if (existing) {
      res.status(409).json({ error: "Conflict", message: "App already has users. Use login instead." });
      return;
    }
    const hashed = await hashPassword(data.password);
    const [user] = await db.insert(usersTable).values({ name: data.name, email: data.email, passwordHash: hashed, role: "owner" }).returning();
    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: "ValidationError", message: err.message }); return; }
    res.status(500).json({ error: "InternalError" });
  }
});

export default router;
