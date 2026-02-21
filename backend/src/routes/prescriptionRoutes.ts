import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";
import { verifyRateLimiter } from "../middleware/rateLimit";
import { createPrescription, listPrescriptions, verifyPrescription } from "../controllers/prescriptionController";

const router = Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["DOCTOR"]),
  createPrescription
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["DOCTOR", "PATIENT", "ADMIN"]),
  listPrescriptions
);

router.post(
  "/verify",
  verifyRateLimiter,
  authMiddleware,
  roleMiddleware(["DOCTOR", "PHARMACIST", "PATIENT"]),
  verifyPrescription
);

export default router;
