import { Router } from "express";
import {
  purchaseController,
  reserveController,
} from "../controllers/reservation.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateParams } from "../middlewares/validateRequest.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { dropIdParamSchema } from "../validators/drop.validators";
import { reservationIdParamSchema } from "../validators/reservation.validators";

const router = Router();

router.post(
  "/drops/:dropId/reserve",
  requireAuth,
  validateParams(dropIdParamSchema),
  asyncHandler(reserveController),
);

router.post(
  "/reservations/:reservationId/purchase",
  requireAuth,
  validateParams(reservationIdParamSchema),
  asyncHandler(purchaseController),
);

export default router;
