import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import coursesRouter from "./courses.js";
import enrollmentsRouter from "./enrollments.js";
import progressRouter from "./progress.js";
import ordersRouter from "./orders.js";
import liveSessionsRouter from "./live-sessions.js";
import communityRouter from "./community.js";
import analyticsRouter from "./analytics.js";
import affiliatesRouter from "./affiliates.js";
import siteSettingsRouter from "./site-settings.js";
import webinarsRouter from "./webinars.js";
import enquiriesRouter from "./enquiries.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/courses", coursesRouter);
router.use("/enrollments", enrollmentsRouter);
router.use("/progress", progressRouter);
router.use("/orders", ordersRouter);
router.use("/live-sessions", liveSessionsRouter);
router.use("/community", communityRouter);
router.use("/analytics", analyticsRouter);
router.use("/affiliates", affiliatesRouter);
router.use("/site-settings", siteSettingsRouter);
router.use("/webinars", webinarsRouter);
router.use("/enquiries", enquiriesRouter);

export default router;
