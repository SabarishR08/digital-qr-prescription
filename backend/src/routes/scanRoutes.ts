import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getRecentScans } from "../controllers/scanController";

const router = Router();

router.get("/recent", authMiddleware, getRecentScans);

export default router;
