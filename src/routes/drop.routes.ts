import { Router } from "express";
import { createDropController } from "../controllers/drop.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validateBody } from "../middlewares/validateRequest.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { createDropSchema } from "../validators/drop.validators";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createDropSchema),
  asyncHandler(createDropController),
);

export default router;
