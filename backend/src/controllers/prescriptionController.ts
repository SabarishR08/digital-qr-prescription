import type { Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
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
      result: "SUCCESS",
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

export async function listPrescriptions(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let where: Record<string, unknown> = {};
  if (req.user.role === "DOCTOR") {
    where = { doctorId: req.user.sub };
  } else if (req.user.role === "PATIENT") {
    where = { patientEmail: req.user.email };
  } else if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  const prescriptions = await prisma.prescription.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  const includeQr = String(req.query.includeQr ?? "").toLowerCase() === "true";
  const allowQr = includeQr || req.user.role === "PATIENT";

  const payload = await Promise.all(
    prescriptions.map(async (prescription) => {
      const base = {
        ...prescription,
        medications: parseMedications(prescription.medications)
      };
      if (!allowQr) {
        return base;
      }

      const qrCode = await generateQrCodeDataUrl(prescription.qrPayload);
      return {
        ...base,
        qrCode
      };
    })
  );

  return res.json({ prescriptions: payload });
}

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
    if (req.user) {
      const payloadHash = crypto.createHash("sha256").update(parsed.data.qrPayload).digest("hex");
      await Promise.all([
        prisma.scanLog.create({
          data: {
            actorId: req.user.sub,
            actorRole: req.user.role,
            payloadHash,
            result: "FAIL",
            reason: "INVALID_OR_EXPIRED"
          }
        }),
        prisma.auditLog.create({
          data: {
            actorRole: req.user.role,
            actorId: req.user.sub,
            action: "QR_VERIFIED",
            result: "FAILED",
            details: "Invalid or expired QR signature"
          }
        })
      ]);
    }
    return res.status(401).json({ error: "Invalid or expired QR" });
  }

  const prescription = await prisma.prescription.findUnique({
    where: { id: payload.prescriptionId }
  });

  if (!prescription) {
    const payloadHash = crypto.createHash("sha256").update(parsed.data.qrPayload).digest("hex");
    await Promise.all([
      prisma.scanLog.create({
        data: {
          actorId: req.user.sub,
          actorRole: req.user.role,
          prescriptionId: payload.prescriptionId,
          payloadHash,
          result: "FAIL",
          reason: "NOT_FOUND"
        }
      }),
      prisma.auditLog.create({
        data: {
          prescriptionId: payload.prescriptionId,
          actorRole: req.user.role,
          actorId: req.user.sub,
          action: "QR_VERIFIED",
          result: "FAILED",
          details: "Prescription not found"
        }
      })
    ]);
    return res.status(404).json({ error: "Prescription not found" });
  }

  if (prescription.expiresAt && prescription.expiresAt.getTime() < Date.now()) {
    const payloadHash = crypto.createHash("sha256").update(parsed.data.qrPayload).digest("hex");
    await Promise.all([
      prisma.scanLog.create({
        data: {
          actorId: req.user.sub,
          actorRole: req.user.role,
          prescriptionId: prescription.id,
          payloadHash,
          result: "FAIL",
          reason: "EXPIRED"
        }
      }),
      prisma.auditLog.create({
        data: {
          prescriptionId: prescription.id,
          actorRole: req.user.role,
          actorId: req.user.sub,
          action: "QR_VERIFIED",
          result: "FAILED",
          details: `Prescription expired at ${prescription.expiresAt.toISOString()}`
        }
      })
    ]);
    return res.status(410).json({ error: "Prescription expired" });
  }

  if (req.user.role === "PHARMACIST" && (prescription.status !== "ACTIVE" || prescription.redeemedAt)) {
    const payloadHash = crypto.createHash("sha256").update(parsed.data.qrPayload).digest("hex");
    await Promise.all([
      prisma.scanLog.create({
        data: {
          actorId: req.user.sub,
          actorRole: req.user.role,
          prescriptionId: prescription.id,
          payloadHash,
          result: "FAIL",
          reason: "ALREADY_REDEEMED"
        }
      }),
      prisma.auditLog.create({
        data: {
          prescriptionId: prescription.id,
          actorRole: req.user.role,
          actorId: req.user.sub,
          action: "QR_VERIFIED",
          result: "FAILED",
          details: `Already redeemed at ${prescription.redeemedAt?.toISOString() ?? "unknown"}`
        }
      })
    ]);
    return res.status(409).json({ error: "Prescription already redeemed" });
  }

  let resolvedPrescription = prescription;
  if (req.user.role === "PHARMACIST") {
    const updated = await prisma.prescription.updateMany({
      where: {
        id: prescription.id,
        status: "ACTIVE",
        redeemedAt: null
      },
      data: {
        status: "REDEEMED",
        redeemedAt: new Date(),
        redeemedById: req.user.sub
      }
    });

    if (updated.count === 0) {
      const payloadHash = crypto.createHash("sha256").update(parsed.data.qrPayload).digest("hex");
      await Promise.all([
        prisma.scanLog.create({
          data: {
            actorId: req.user.sub,
            actorRole: req.user.role,
            prescriptionId: prescription.id,
            payloadHash,
            result: "FAIL",
            reason: "ALREADY_REDEEMED"
          }
        }),
        prisma.auditLog.create({
          data: {
            prescriptionId: prescription.id,
            actorRole: req.user.role,
            actorId: req.user.sub,
            action: "QR_VERIFIED",
            result: "FAILED",
            details: "Race condition: Already redeemed"
          }
        })
      ]);
      return res.status(409).json({ error: "Prescription already redeemed" });
    }

    const refreshed = await prisma.prescription.findUnique({ where: { id: prescription.id } });
    if (refreshed) {
      resolvedPrescription = refreshed;
    }
  }

  await prisma.auditLog.create({
    data: {
      prescriptionId: prescription.id,
      actorRole: req.user.role,
      actorId: req.user.sub,
      action: "QR_VERIFIED",
      result: "SUCCESS",
      details: `Verified by ${req.user.role}`
    }
  });

  await prisma.scanLog.create({
    data: {
      actorId: req.user.sub,
      actorRole: req.user.role,
      prescriptionId: prescription.id,
      payloadHash: crypto.createHash("sha256").update(parsed.data.qrPayload).digest("hex"),
      result: "SUCCESS",
      reason: "VERIFIED"
    }
  });

  return res.json({
    prescription: {
      ...resolvedPrescription,
      medications: parseMedications(resolvedPrescription.medications)
    }
  });
}
