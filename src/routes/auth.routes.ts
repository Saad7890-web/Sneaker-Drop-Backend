import { Router } from "express";
import { login, register } from "../controllers/auth.controller";
import { authLimiter } from "../middlewares/rateLimit.middleware";
import { validateBody } from "../middlewares/validateRequest.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { loginSchema, registerSchema } from "../validators/auth.validators";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(register),
);
router.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(login),
);

export default router;
