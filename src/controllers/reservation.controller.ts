import type { Request, Response } from "express";
import {
  broadcastPurchaseCompleted,
  broadcastReservationCreated,
  broadcastStockUpdated,
} from "../realtime/broadcaster";
import {
  completeReservationPurchase,
  reserveDropItem,
} from "../services/reservation.service";

export const reserveController = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      },
    });
  }

  const { dropId } = req.params;
  if (!dropId || Array.isArray(dropId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Invalid reservationId",
        code: "INVALID_RESERVATION_ID",
      },
    });
  }
  const result = await reserveDropItem(req.user.id, dropId);

  broadcastReservationCreated({
    reservationId: result.reservation.id,
    dropId: result.drop.id,
    userId: result.reservation.userId,
    expiresAt: result.reservation.expiresAt.toISOString(),
    availableStock: result.drop.availableStock,
    status: result.drop.status,
  });

  broadcastStockUpdated({
    dropId: result.drop.id,
    availableStock: result.drop.availableStock,
    status: result.drop.status,
  });

  return res.status(201).json({
    success: true,
    data: result,
  });
};

export const purchaseController = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      },
    });
  }

  const { reservationId } = req.params;
  if (!reservationId || Array.isArray(reservationId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Invalid reservationId",
        code: "INVALID_RESERVATION_ID",
      },
    });
  }
  const result = await completeReservationPurchase(req.user.id, reservationId);

  broadcastPurchaseCompleted({
    purchaseId: result.purchase.id,
    reservationId: result.purchase.reservationId,
    dropId: result.purchase.dropId,
    userId: result.purchase.userId,
    purchasedAt: result.purchase.purchasedAt.toISOString(),
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
};
