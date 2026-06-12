import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;

  if (!header) {
    return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }

  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };

    return next();
  } catch {
    return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }
};
