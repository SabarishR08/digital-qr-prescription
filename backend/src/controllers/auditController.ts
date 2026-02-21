import type { Request, Response } from "express";
import prisma from "../config/prisma";

const DEFAULT_LIMIT = 50;

type AuditFilters = {
  where: Record<string, unknown>;
  take: number;
  skip: number;
};

function buildAuditFilters(req: Request): AuditFilters {
  const limit = Number(req.query.limit ?? DEFAULT_LIMIT);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : DEFAULT_LIMIT;
  const offset = Number(req.query.offset ?? 0);
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.min(offset, 10000) : 0;
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

  return { where: baseWhere, take: safeLimit, skip: safeOffset };
}

function escapeCsv(value: string) {
  if (value.includes("\n") || value.includes(",") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function logsToCsv(logs: Array<{ [key: string]: unknown }>) {
  const headers = [
    "createdAt",
    "action",
    "actorRole",
    "actorId",
    "prescriptionId",
    "details",
    "patientName",
    "patientEmail"
  ];

  const rows = logs.map((log) => {
    const createdAt = log.createdAt instanceof Date ? log.createdAt.toISOString() : "";
    const details = typeof log.details === "string" ? log.details : "";
    const prescription = log.prescription as { patientName?: string; patientEmail?: string } | undefined;

    const values = [
      createdAt,
      typeof log.action === "string" ? log.action : "",
      typeof log.actorRole === "string" ? log.actorRole : "",
      typeof log.actorId === "string" ? log.actorId : "",
      typeof log.prescriptionId === "string" ? log.prescriptionId : "",
      details,
      prescription?.patientName ?? "",
      prescription?.patientEmail ?? ""
    ];

    return values.map((value) => escapeCsv(String(value))).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export async function getRecentAuditLogs(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { where: baseWhere, take, skip } = buildAuditFilters(req);

  if (req.user.role === "ADMIN") {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take,
        skip,
        where: baseWhere,
        include: { prescription: true }
      }),
      prisma.auditLog.count({ where: baseWhere })
    ]);

    return res.json({ logs, total, limit: take, offset: skip });
  }

  if (req.user.role === "DOCTOR") {
    const where = {
      ...baseWhere,
      prescription: { doctorId: req.user.sub }
    };
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take,
        skip,
        where,
        include: { prescription: true }
      }),
      prisma.auditLog.count({ where })
    ]);

    return res.json({ logs, total, limit: take, offset: skip });
  }

  const where = {
    ...baseWhere,
    actorId: req.user.sub
  };
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip,
      where,
      include: { prescription: true }
    }),
    prisma.auditLog.count({ where })
  ]);

  return res.json({ logs, total, limit: take, offset: skip });
}

export async function exportAuditCsv(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { where: baseWhere, take, skip } = buildAuditFilters(req);
  const shared = {
    orderBy: { createdAt: "desc" },
    take,
    skip,
    include: { prescription: true }
  } as const;

  let logs;
  if (req.user.role === "ADMIN") {
    logs = await prisma.auditLog.findMany({
      ...shared,
      where: baseWhere
    });
  } else if (req.user.role === "DOCTOR") {
    logs = await prisma.auditLog.findMany({
      ...shared,
      where: {
        ...baseWhere,
        prescription: { doctorId: req.user.sub }
      }
    });
  } else {
    logs = await prisma.auditLog.findMany({
      ...shared,
      where: {
        ...baseWhere,
        actorId: req.user.sub
      }
    });
  }

  const csv = logsToCsv(logs as Array<{ [key: string]: unknown }>);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=audits.csv");
  return res.send(csv);
}
