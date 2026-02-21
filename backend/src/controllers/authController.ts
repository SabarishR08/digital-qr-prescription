import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/prisma";
import { hashPassword, verifyPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import type { Role } from "../types/roles";
import { generateRefreshToken, hashRefreshToken } from "../utils/refreshToken";

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["DOCTOR", "PATIENT", "PHARMACIST"])
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const REFRESH_TOKEN_DAYS = 7;

function getRefreshExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}

async function issueRefreshToken(userId: string) {
  const rawToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = getRefreshExpiry();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return { rawToken, expiresAt };
}

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/auth/refresh",
    expires: expiresAt
  });
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const { fullName, email, password, role } = parsed.data as {
    fullName: string;
    email: string;
    password: string;
    role: Role;
  };
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      role
    }
  });

  await prisma.userPreference.create({
    data: {
      userId: user.id
    }
  });

  const token = signToken({
    sub: user.id,
    role: user.role as Role,
    email: user.email,
    fullName: user.fullName
  });

  const refreshToken = await issueRefreshToken(user.id);
  setRefreshCookie(res, refreshToken.rawToken, refreshToken.expiresAt);

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({
    sub: user.id,
    role: user.role as Role,
    email: user.email,
    fullName: user.fullName
  });

  const refreshToken = await issueRefreshToken(user.id);
  setRefreshCookie(res, refreshToken.rawToken, refreshToken.expiresAt);

  return res.json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }
  });
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role
  });
}

export async function refresh(req: Request, res: Response) {
  const rawToken = req.cookies?.refreshToken;
  if (!rawToken) {
    return res.status(401).json({ error: "Missing refresh token" });
  }

  const tokenHash = hashRefreshToken(rawToken);
  const record = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: true
    }
  });

  if (!record) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() }
  });

  const nextRefresh = await issueRefreshToken(record.userId);
  setRefreshCookie(res, nextRefresh.rawToken, nextRefresh.expiresAt);

  const accessToken = signToken({
    sub: record.userId,
    role: record.user.role as Role,
    email: record.user.email,
    fullName: record.user.fullName
  });

  return res.json({
    token: accessToken,
    user: {
      id: record.user.id,
      fullName: record.user.fullName,
      email: record.user.email,
      role: record.user.role
    }
  });
}

export async function logout(req: Request, res: Response) {
  const rawToken = req.cookies?.refreshToken;
  if (rawToken) {
    const tokenHash = hashRefreshToken(rawToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  res.clearCookie("refreshToken", { path: "/auth/refresh" });
  return res.json({ ok: true });
}
