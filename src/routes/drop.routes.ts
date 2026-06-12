import { Router } from "express";
import { createDropController } from "../controllers/drop.controller";
import {
  getDropController,
  listActiveDropsController,
} from "../controllers/drop.query.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middlewares/validateRequest.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { paginationQuerySchema } from "../validators/common.validators";
import {
  createDropSchema,
  dropIdParamSchema,
} from "../validators/drop.validators";

const router = Router();

router.get(
  "/active",
  validateQuery(paginationQuerySchema),
  asyncHandler(listActiveDropsController),
);

router.get(
  "/:dropId",
  validateParams(dropIdParamSchema),
  asyncHandler(getDropController),
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createDropSchema),
  asyncHandler(createDropController),
);

export default router;
