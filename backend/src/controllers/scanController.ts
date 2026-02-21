import type { Request, Response } from "express";
import prisma from "../config/prisma";

const DEFAULT_LIMIT = 20;

type ScanFilters = {
  where: Record<string, unknown>;
  take: number;
  skip: number;
  cursor?: string;
  q?: string;
};

function buildScanFilters(req: Request): ScanFilters {
  const limit = Number(req.query.limit ?? DEFAULT_LIMIT);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : DEFAULT_LIMIT;
  const offset = Number(req.query.offset ?? 0);
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.min(offset, 10000) : 0;
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const q = req.query.q ? String(req.query.q).trim() : undefined;
  const result = req.query.result ? String(req.query.result) : undefined;
  const prescriptionId = req.query.prescriptionId ? String(req.query.prescriptionId) : undefined;
  const actorRole = req.query.actorRole ? String(req.query.actorRole) : undefined;

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
  if (result) {
    baseWhere.result = result;
  }
  if (prescriptionId) {
    baseWhere.prescriptionId = prescriptionId;
  }
  if (actorRole) {
    baseWhere.actorRole = actorRole;
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

function scansToCsv(scans: Array<{ [key: string]: unknown }>) {
  const headers = [
    "createdAt",
    "result",
    "actorRole",
    "actorId",
    "prescriptionId",
    "reason"
  ];

  const rows = scans.map((scan) => {
    const createdAt = scan.createdAt instanceof Date ? scan.createdAt.toISOString() : "";
    const values = [
      createdAt,
      typeof scan.result === "string" ? scan.result : "",
      typeof scan.actorRole === "string" ? scan.actorRole : "",
      typeof scan.actorId === "string" ? scan.actorId : "",
      typeof scan.prescriptionId === "string" ? scan.prescriptionId : "",
      typeof scan.reason === "string" ? scan.reason : ""
    ];

    return values.map((value) => escapeCsv(String(value))).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export async function getRecentScans(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { where: baseWhere, take, skip, cursor, q } = buildScanFilters(req);
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
        { prescriptionId: { contains: q } },
        { actorRole: { contains: q } },
        { actorId: { contains: q } },
        { reason: { contains: q } },
        { result: { contains: q } },
        ...(userIds.length ? [{ actorId: { in: userIds } }] : [])
      ]
    };
  }

  const pagination = cursor ? { cursor: { id: cursor }, skip } : { skip };

  if (req.user.role === "ADMIN") {
    const [scans, total] = await Promise.all([
      prisma.scanLog.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        ...pagination,
        where,
        include: { prescription: true }
      }),
      prisma.scanLog.count({ where })
    ]);

    const nextCursor = scans.length === take ? scans[scans.length - 1]?.id : null;
    return res.json({ scans, total, limit: take, offset: skip, nextCursor });
  }

  if (req.user.role === "DOCTOR") {
    const doctorWhere = {
      ...where,
      prescription: { doctorId: req.user.sub }
    };
    const [scans, total] = await Promise.all([
      prisma.scanLog.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        ...pagination,
        where: doctorWhere,
        include: { prescription: true }
      }),
      prisma.scanLog.count({ where: doctorWhere })
    ]);

    const nextCursor = scans.length === take ? scans[scans.length - 1]?.id : null;
    return res.json({ scans, total, limit: take, offset: skip, nextCursor });
  }

  const userWhere = {
    ...where,
    actorId: req.user.sub
  };
  const [scans, total] = await Promise.all([
    prisma.scanLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...pagination,
      where: userWhere,
      include: { prescription: true }
    }),
    prisma.scanLog.count({ where: userWhere })
  ]);

  const nextCursor = scans.length === take ? scans[scans.length - 1]?.id : null;
  return res.json({ scans, total, limit: take, offset: skip, nextCursor });
}

export async function exportScanCsv(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { where: baseWhere, q } = buildScanFilters(req);
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
        { prescriptionId: { contains: q } },
        { actorRole: { contains: q } },
        { actorId: { contains: q } },
        { reason: { contains: q } },
        { result: { contains: q } },
        ...(userIds.length ? [{ actorId: { in: userIds } }] : [])
      ]
    };
  }

  const shared = {
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  } as const;

  let scans;
  if (req.user.role === "ADMIN") {
    scans = await prisma.scanLog.findMany({
      ...shared,
      where
    });
  } else if (req.user.role === "DOCTOR") {
    scans = await prisma.scanLog.findMany({
      ...shared,
      where: {
        ...where,
        prescription: { doctorId: req.user.sub }
      }
    });
  } else {
    scans = await prisma.scanLog.findMany({
      ...shared,
      where: {
        ...where,
        actorId: req.user.sub
      }
    });
  }

  if (format === "json") {
    const payload = JSON.stringify(scans);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=scan-history.json");
    return res.send(payload);
  }

  const csv = scansToCsv(scans as Array<{ [key: string]: unknown }>);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=scan-history.csv");
  return res.send(csv);
}
