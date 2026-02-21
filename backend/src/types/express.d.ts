import type { Role } from "./roles";

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        role: Role;
        email: string;
        fullName: string;
      };
    }
  }
}

export {};
