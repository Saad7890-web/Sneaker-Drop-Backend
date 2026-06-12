import type { NextFunction, Request, Response } from "express";
import logger from "../config/logger";
import { AppError } from "../utils/AppError";

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    });
  }

  logger.error({ err }, "Unhandled error");

  return res.status(500).json({
    success: false,
    error: {
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    },
  });
};
