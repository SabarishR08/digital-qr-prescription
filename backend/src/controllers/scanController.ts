import type { Request, Response } from "express";
import prisma from "../config/prisma";

const DEFAULT_LIMIT = 20;

type ScanFilters = {
  where: Record<string, unknown>;
  take: number;
  skip: number;
};

function buildScanFilters(req: Request): ScanFilters {
  const limit = Number(req.query.limit ?? DEFAULT_LIMIT);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : DEFAULT_LIMIT;
  const offset = Number(req.query.offset ?? 0);
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.min(offset, 10000) : 0;
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

  return { where: baseWhere, take: safeLimit, skip: safeOffset };
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

  const { where: baseWhere, take, skip } = buildScanFilters(req);

  if (req.user.role === "ADMIN") {
    const [scans, total] = await Promise.all([
      prisma.scanLog.findMany({
        orderBy: { createdAt: "desc" },
        take,
        skip,
        where: baseWhere,
        include: { prescription: true }
      }),
      prisma.scanLog.count({ where: baseWhere })
    ]);

    return res.json({ scans, total, limit: take, offset: skip });
  }

  const where = {
    ...baseWhere,
    actorId: req.user.sub
  };
  const [scans, total] = await Promise.all([
    prisma.scanLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip,
      where,
      include: { prescription: true }
    }),
    prisma.scanLog.count({ where })
  ]);

  return res.json({ scans, total, limit: take, offset: skip });
}

export async function exportScanCsv(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { where: baseWhere, take, skip } = buildScanFilters(req);
  const shared = {
    orderBy: { createdAt: "desc" },
    take,
    skip
  } as const;

  let scans;
  if (req.user.role === "ADMIN") {
    scans = await prisma.scanLog.findMany({
      ...shared,
      where: baseWhere
    });
  } else {
    scans = await prisma.scanLog.findMany({
      ...shared,
      where: {
        ...baseWhere,
        actorId: req.user.sub
      }
    });
  }

  const csv = scansToCsv(scans as Array<{ [key: string]: unknown }>);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=scan-history.csv");
  return res.send(csv);
}
