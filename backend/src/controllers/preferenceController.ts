import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { getDefaultPreferences } from "../utils/preferences";

const updateSchema = z.object({
  auditRefreshEnabled: z.boolean().optional(),
  auditRefreshInterval: z.number().int().min(5000).max(60000).optional(),
  scanRefreshEnabled: z.boolean().optional(),
  scanRefreshInterval: z.number().int().min(5000).max(60000).optional(),
  scanPinnedVisible: z.boolean().optional()
});

const DEFAULTS = {
  auditRefreshEnabled: true,
  auditRefreshInterval: 15000,
  scanRefreshEnabled: true,
  scanRefreshInterval: 15000,
  scanPinnedVisible: true
};

export async function getPreferences(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const defaults = await getDefaultPreferences(prisma);
  const preference = await prisma.userPreference.upsert({
    where: { userId: req.user.sub },
    create: {
      userId: req.user.sub,
      ...defaults
    },
    update: {}
  });

  return res.json({ preference });
}

export async function updatePreferences(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const defaults = await getDefaultPreferences(prisma);
  const preference = await prisma.userPreference.upsert({
    where: { userId: req.user.sub },
    create: {
      userId: req.user.sub,
      ...defaults,
      ...parsed.data
    },
    update: parsed.data
  });

  return res.json({ preference });
}

export async function resetPreferences(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const defaults = await getDefaultPreferences(prisma);
  const preference = await prisma.userPreference.upsert({
    where: { userId: req.user.sub },
    create: {
      userId: req.user.sub,
      ...defaults
    },
    update: defaults
  });

  return res.json({ preference });
}

export async function getDefaultPreference(req: Request, res: Response) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const existing = await prisma.preferenceDefault.findUnique({
    where: { id: "GLOBAL" },
    include: {
      updatedBy: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    }
  });

  const defaults = existing
    ? existing
    : await prisma.preferenceDefault.create({
        data: {
          id: "GLOBAL",
          ...DEFAULTS
        },
        include: {
          updatedBy: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      });

  return res.json({
    defaults: {
      auditRefreshEnabled: defaults.auditRefreshEnabled,
      auditRefreshInterval: defaults.auditRefreshInterval,
      scanRefreshEnabled: defaults.scanRefreshEnabled,
      scanRefreshInterval: defaults.scanRefreshInterval,
      scanPinnedVisible: defaults.scanPinnedVisible
    },
    updatedAt: defaults.updatedAt,
    updatedBy: defaults.updatedBy ?? null
  });
}

export async function updateDefaultPreference(req: Request, res: Response) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const defaults = await prisma.preferenceDefault.upsert({
    where: { id: "GLOBAL" },
    create: {
      id: "GLOBAL",
      ...DEFAULTS,
      ...parsed.data,
      updatedById: req.user.sub
    },
    update: {
      ...parsed.data,
      updatedById: req.user.sub
    },
    include: {
      updatedBy: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    }
  });

  return res.json({
    defaults: {
      auditRefreshEnabled: defaults.auditRefreshEnabled,
      auditRefreshInterval: defaults.auditRefreshInterval,
      scanRefreshEnabled: defaults.scanRefreshEnabled,
      scanRefreshInterval: defaults.scanRefreshInterval,
      scanPinnedVisible: defaults.scanPinnedVisible
    },
    updatedAt: defaults.updatedAt,
    updatedBy: defaults.updatedBy ?? null
  });
}
