import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";
import { createPrescription, verifyPrescription } from "../controllers/prescriptionController";

const router = Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["DOCTOR"]),
  createPrescription
);

router.post(
  "/verify",
  authMiddleware,
  roleMiddleware(["DOCTOR", "PHARMACIST", "PATIENT"]),
  verifyPrescription
);

export default router;
