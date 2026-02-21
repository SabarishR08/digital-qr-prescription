import type { Request, Response, NextFunction } from "express";
import type { Role } from "../types/roles";

type RoleList = Role[];

export function roleMiddleware(roles: RoleList) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}
