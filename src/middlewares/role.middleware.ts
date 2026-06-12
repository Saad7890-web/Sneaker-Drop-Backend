import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export const requireRole =
  (...allowedRoles: Array<"USER" | "ADMIN">) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403, "FORBIDDEN"));
    }

    return next();
  };
