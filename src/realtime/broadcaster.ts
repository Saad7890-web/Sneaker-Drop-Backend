import { getIO } from "../socket";
import {
  SocketEvents,
  type PurchaseCompletedPayload,
  type ReservationCreatedPayload,
  type ReservationExpiredPayload,
  type StockUpdatedPayload,
} from "./events";

const safeEmit = (event: string, payload: unknown) => {
  try {
    getIO().emit(event, payload);
  } catch {}
};

export const broadcastStockUpdated = (payload: StockUpdatedPayload) => {
  safeEmit(SocketEvents.STOCK_UPDATED, payload);
};

export const broadcastReservationCreated = (
  payload: ReservationCreatedPayload,
) => {
  safeEmit(SocketEvents.RESERVATION_CREATED, payload);
};

export const broadcastReservationExpired = (
  payload: ReservationExpiredPayload,
) => {
  safeEmit(SocketEvents.RESERVATION_EXPIRED, payload);
};

export const broadcastPurchaseCompleted = (
  payload: PurchaseCompletedPayload,
) => {
  safeEmit(SocketEvents.PURCHASE_COMPLETED, payload);
};
