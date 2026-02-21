import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { exportScanCsv, getRecentScans } from "../controllers/scanController";

const router = Router();

router.get("/recent", authMiddleware, getRecentScans);
router.get("/export", authMiddleware, exportScanCsv);

export default router;
