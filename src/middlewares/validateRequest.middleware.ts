import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { AppError } from "../utils/AppError";

const buildValidator =
  (target: "body" | "params" | "query") =>
  <T extends ZodTypeAny>(schema: T): RequestHandler =>
  (req, res, next) => {
    const parsed = schema.safeParse(req[target]);

    if (!parsed.success) {
      return next(
        new AppError(
          "Invalid request data",
          400,
          "VALIDATION_ERROR",
          parsed.error.flatten(),
        ),
      );
    }

    res.locals.validated ??= {};
    res.locals.validated[target] = parsed.data;

    return next();
  };

export const validateBody = buildValidator("body");
export const validateParams = buildValidator("params");
export const validateQuery = buildValidator("query");
