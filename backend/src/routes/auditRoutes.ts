import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getRecentAuditLogs } from "../controllers/auditController";

const router = Router();

router.get("/recent", authMiddleware, getRecentAuditLogs);

export default router;
