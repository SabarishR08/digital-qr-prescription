import type { Request, Response } from "express";
import prisma from "../config/prisma";

const DEFAULT_LIMIT = 50;

type AuditFilters = {
  where: Record<string, unknown>;
  take: number;
  skip: number;
  cursor?: string;
  q?: string;
};

function buildAuditFilters(req: Request): AuditFilters {
  const limit = Number(req.query.limit ?? DEFAULT_LIMIT);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : DEFAULT_LIMIT;
  const offset = Number(req.query.offset ?? 0);
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.min(offset, 10000) : 0;
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const q = req.query.q ? String(req.query.q).trim() : undefined;
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

  return {
    where: baseWhere,
    take: safeLimit,
    skip: cursor ? 1 : safeOffset,
    cursor,
    q
  };
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

  const { where: baseWhere, take, skip, cursor, q } = buildAuditFilters(req);
  let where = baseWhere as Record<string, unknown>;

  if (q) {
    const users = await prisma.user.findMany({
      where: { email: { contains: q } },
      select: { id: true }
    });
    const userIds = users.map((user) => user.id);
    where = {
      ...where,
      OR: [
        { action: { contains: q } },
        { prescriptionId: { contains: q } },
        { actorRole: { contains: q } },
        { actorId: { contains: q } },
        { details: { contains: q } },
        ...(userIds.length ? [{ actorId: { in: userIds } }] : [])
      ]
    };
  }

  const pagination = cursor ? { cursor: { id: cursor }, skip } : { skip };

  if (req.user.role === "ADMIN") {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        ...pagination,
        where,
        include: { prescription: true }
      }),
      prisma.auditLog.count({ where })
    ]);

    const nextCursor = logs.length === take ? logs[logs.length - 1]?.id : null;
    return res.json({ logs, total, limit: take, offset: skip, nextCursor });
  }

  if (req.user.role === "DOCTOR") {
    const where = {
      ...where,
      prescription: { doctorId: req.user.sub }
    };
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        ...pagination,
        where,
        include: { prescription: true }
      }),
      prisma.auditLog.count({ where })
    ]);

    const nextCursor = logs.length === take ? logs[logs.length - 1]?.id : null;
    return res.json({ logs, total, limit: take, offset: skip, nextCursor });
  }

  const where = {
    ...where,
    actorId: req.user.sub
  };
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...pagination,
      where,
      include: { prescription: true }
    }),
    prisma.auditLog.count({ where })
  ]);

  const nextCursor = logs.length === take ? logs[logs.length - 1]?.id : null;
  return res.json({ logs, total, limit: take, offset: skip, nextCursor });
}

export async function exportAuditCsv(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { where: baseWhere, q } = buildAuditFilters(req);
  const format = req.query.format ? String(req.query.format).toLowerCase() : "csv";
  let where = baseWhere as Record<string, unknown>;

  if (q) {
    const users = await prisma.user.findMany({
      where: { email: { contains: q } },
      select: { id: true }
    });
    const userIds = users.map((user) => user.id);
    where = {
      ...where,
      OR: [
        { action: { contains: q } },
        { prescriptionId: { contains: q } },
        { actorRole: { contains: q } },
        { actorId: { contains: q } },
        { details: { contains: q } },
        ...(userIds.length ? [{ actorId: { in: userIds } }] : [])
      ]
    };
  }

  const shared = {
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { prescription: true }
  } as const;

  let logs;
  if (req.user.role === "ADMIN") {
    logs = await prisma.auditLog.findMany({
      ...shared,
      where
    });
  } else if (req.user.role === "DOCTOR") {
    logs = await prisma.auditLog.findMany({
      ...shared,
      where: {
        ...where,
        prescription: { doctorId: req.user.sub }
      }
    });
  } else {
    logs = await prisma.auditLog.findMany({
      ...shared,
      where: {
        ...where,
        actorId: req.user.sub
      }
    });
  }

  if (format === "json") {
    const payload = JSON.stringify(logs);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=audits.json");
    return res.send(payload);
  }

  const csv = logsToCsv(logs as Array<{ [key: string]: unknown }>);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=audits.csv");
  return res.send(csv);
}
