import { Router } from "express";
import { login, logout, me, refresh, register } from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";
import { authRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.get("/me", authMiddleware, me);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
