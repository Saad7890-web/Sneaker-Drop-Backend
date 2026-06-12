import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export const requireUserMatchesParam =
  (paramName = "userId") =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    if (req.params[paramName] !== req.user.id) {
      return next(new AppError("Forbidden", 403, "FORBIDDEN"));
    }

    return next();
  };
