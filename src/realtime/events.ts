export const SocketEvents = {
  STOCK_UPDATED: "stock_updated",
  RESERVATION_CREATED: "reservation_created",
  RESERVATION_EXPIRED: "reservation_expired",
  PURCHASE_COMPLETED: "purchase_completed",
} as const;

export type StockUpdatedPayload = {
  dropId: string;
  availableStock: number;
  status: string;
};

export type ReservationCreatedPayload = {
  reservationId: string;
  dropId: string;
  userId: string;
  expiresAt: string;
  availableStock: number;
  status: string;
};

export type ReservationExpiredPayload = {
  reservationId: string;
  dropId: string;
  userId: string;
  expiredAt: string;
  availableStock: number;
  status: string;
};

export type PurchaseCompletedPayload = {
  purchaseId: string;
  reservationId: string;
  dropId: string;
  userId: string;
  purchasedAt: string;
};
