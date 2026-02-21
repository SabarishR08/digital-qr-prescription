import type { Request, Response } from "express";
import prisma from "../config/prisma";

const DEFAULT_LIMIT = 50;

export async function getRecentAuditLogs(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const limit = Number(req.query.limit ?? DEFAULT_LIMIT);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : DEFAULT_LIMIT;
  const action = req.query.action ? String(req.query.action) : undefined;
  const actorRole = req.query.actorRole ? String(req.query.actorRole) : undefined;
  const prescriptionId = req.query.prescriptionId ? String(req.query.prescriptionId) : undefined;

  const parseDate = (value?: string) => {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const from = parseDate(req.query.from ? String(req.query.from) : undefined);
  const to = parseDate(req.query.to ? String(req.query.to) : undefined);

  const baseWhere: Record<string, unknown> = {};
  if (action) {
    baseWhere.action = { contains: action };
  }
  if (actorRole) {
    baseWhere.actorRole = actorRole;
  }
  if (prescriptionId) {
    baseWhere.prescriptionId = prescriptionId;
  }
  if (from || to) {
    baseWhere.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {})
    };
  }

  if (req.user.role === "ADMIN") {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      where: baseWhere,
      include: { prescription: true }
    });

    return res.json({ logs });
  }

  if (req.user.role === "DOCTOR") {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      where: {
        ...baseWhere,
        prescription: { doctorId: req.user.sub }
      },
      include: { prescription: true }
    });

    return res.json({ logs });
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: safeLimit,
    where: {
      ...baseWhere,
      actorId: req.user.sub
    },
    include: { prescription: true }
  });

  return res.json({ logs });
}
