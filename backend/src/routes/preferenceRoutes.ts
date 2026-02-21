import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getPreferences, getDefaultPreference, resetPreferences, updateDefaultPreference, updatePreferences } from "../controllers/preferenceController";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();

router.get("/preferences", authMiddleware, getPreferences);
router.put("/preferences", authMiddleware, updatePreferences);
router.post("/preferences/reset", authMiddleware, resetPreferences);
router.get("/preferences/defaults", authMiddleware, roleMiddleware(["ADMIN"]), getDefaultPreference);
router.put("/preferences/defaults", authMiddleware, roleMiddleware(["ADMIN"]), updateDefaultPreference);

export default router;
