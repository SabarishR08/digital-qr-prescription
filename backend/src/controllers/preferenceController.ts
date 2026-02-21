import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";

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

  const preference = await prisma.userPreference.upsert({
    where: { userId: req.user.sub },
    create: {
      userId: req.user.sub,
      ...DEFAULTS
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

  const preference = await prisma.userPreference.upsert({
    where: { userId: req.user.sub },
    create: {
      userId: req.user.sub,
      ...DEFAULTS,
      ...parsed.data
    },
    update: parsed.data
  });

  return res.json({ preference });
}
