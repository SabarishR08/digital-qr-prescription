import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getPreferences, updatePreferences } from "../controllers/preferenceController";

const router = Router();

router.get("/preferences", authMiddleware, getPreferences);
router.put("/preferences", authMiddleware, updatePreferences);

export default router;
