import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { createQrPayload, verifyQrPayload } from "../utils/qrPayload";
import { generateQrCodeDataUrl } from "../utils/qrCode";

function parseMedications(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

const medicationSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().min(1)
});

const createSchema = z.object({
  patientName: z.string().min(2),
  patientEmail: z.string().email(),
  notes: z.string().max(1000).optional(),
  medications: z.array(medicationSchema).min(1),
  expiresAt: z.string().datetime().optional()
});

export async function createPrescription(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const expiresAt = parsed.data.expiresAt
    ? new Date(parsed.data.expiresAt)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const prescription = await prisma.prescription.create({
    data: {
      doctorId: req.user.sub,
      patientName: parsed.data.patientName,
      patientEmail: parsed.data.patientEmail,
      notes: parsed.data.notes,
      medications: JSON.stringify(parsed.data.medications),
      qrPayload: "",
      expiresAt
    }
  });

  const qrPayload = createQrPayload(prescription.id, expiresAt);
  const qrCode = await generateQrCodeDataUrl(qrPayload);

  const updated = await prisma.prescription.update({
    where: { id: prescription.id },
    data: {
      qrPayload
    }
  });

  await prisma.auditLog.create({
    data: {
      prescriptionId: prescription.id,
      actorRole: req.user.role,
      actorId: req.user.sub,
      action: "PRESCRIPTION_CREATED",
      details: `QR issued; expires ${expiresAt.toISOString()}`
    }
  });

  return res.status(201).json({
    prescription: {
      ...updated,
      medications: parseMedications(updated.medications)
    },
    qrCode
  });
}

const verifySchema = z.object({
  qrPayload: z.string().min(10)
});

export async function verifyPrescription(req: Request, res: Response) {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = verifyQrPayload(parsed.data.qrPayload);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired QR" });
  }

  const prescription = await prisma.prescription.findUnique({
    where: { id: payload.prescriptionId }
  });

  if (!prescription) {
    return res.status(404).json({ error: "Prescription not found" });
  }

  await prisma.auditLog.create({
    data: {
      prescriptionId: prescription.id,
      actorRole: req.user.role,
      actorId: req.user.sub,
      action: "QR_VERIFIED",
      details: `Verified by ${req.user.role}`
    }
  });

  return res.json({
    prescription: {
      ...prescription,
      medications: parseMedications(prescription.medications)
    }
  });
}
