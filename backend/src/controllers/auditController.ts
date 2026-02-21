import type { Request, Response } from "express";
import prisma from "../config/prisma";

const DEFAULT_LIMIT = 50;

export async function getRecentAuditLogs(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const limit = Number(req.query.limit ?? DEFAULT_LIMIT);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : DEFAULT_LIMIT;

  if (req.user.role === "ADMIN") {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      include: { prescription: true }
    });

    return res.json({ logs });
  }

  if (req.user.role === "DOCTOR") {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      where: {
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
      actorId: req.user.sub
    },
    include: { prescription: true }
  });

  return res.json({ logs });
}
