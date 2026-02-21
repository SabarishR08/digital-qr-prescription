import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { exportAuditCsv, getRecentAuditLogs } from "../controllers/auditController";

const router = Router();

router.get("/recent", authMiddleware, getRecentAuditLogs);
router.get("/export", authMiddleware, exportAuditCsv);

export default router;
