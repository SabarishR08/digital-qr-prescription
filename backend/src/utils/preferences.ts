import type { PrismaClient } from "@prisma/client";

export const DEFAULT_PREFERENCES = {
  auditRefreshEnabled: true,
  auditRefreshInterval: 15000,
  scanRefreshEnabled: true,
  scanRefreshInterval: 15000,
  scanPinnedVisible: true
};

export async function getDefaultPreferences(prisma: PrismaClient) {
  const defaults = await prisma.preferenceDefault.findUnique({
    where: { id: "GLOBAL" }
  });

  if (defaults) {
    return {
      auditRefreshEnabled: defaults.auditRefreshEnabled,
      auditRefreshInterval: defaults.auditRefreshInterval,
      scanRefreshEnabled: defaults.scanRefreshEnabled,
      scanRefreshInterval: defaults.scanRefreshInterval,
      scanPinnedVisible: defaults.scanPinnedVisible
    };
  }

  const created = await prisma.preferenceDefault.create({
    data: {
      id: "GLOBAL",
      ...DEFAULT_PREFERENCES
    }
  });

  return {
    auditRefreshEnabled: created.auditRefreshEnabled,
    auditRefreshInterval: created.auditRefreshInterval,
    scanRefreshEnabled: created.scanRefreshEnabled,
    scanRefreshInterval: created.scanRefreshInterval,
    scanPinnedVisible: created.scanPinnedVisible
  };
}
