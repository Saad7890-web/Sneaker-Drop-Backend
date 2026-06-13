import prisma from "../config/prisma";
import {
  DropStatus,
  Prisma,
  ReservationStatus,
} from "../generated/prisma/client";
import { lockDropById } from "../repositories/drop.repository";
import { purchaseExistsByReservationId } from "../repositories/purchase.repository";
import { lockReservationById } from "../repositories/reservation.repository";
import { AppError } from "../utils/AppError";

const RESERVATION_WINDOW_MS = 60_000;

type ReserveResult = {
  drop: {
    id: string;
    title: string;
    totalStock: number;
    availableStock: number;
    status: string;
    startsAt: Date;
    endsAt: Date | null;
  };
  reservation: {
    id: string;
    userId: string;
    dropId: string;
    status: string;
    reservedAt: Date;
    expiresAt: Date;
  };
};

type PurchaseResult = {
  purchase: {
    id: string;
    userId: string;
    dropId: string;
    reservationId: string;
    status: string;
    purchasedAt: Date;
  };
  reservation: {
    id: string;
    status: string;
    completedAt: Date | null;
  };
};

const getDatabaseNow = async (tx: Prisma.TransactionClient): Promise<Date> => {
  const rows = await tx.$queryRaw<{ now: Date }[]>`
    SELECT NOW() AS now
  `;

  return rows[0]?.now ?? new Date();
};

export const reserveDropItem = async (
  userId: string,
  dropId: string,
): Promise<ReserveResult> => {
  return prisma.$transaction(async (tx) => {
    const drop = await lockDropById(tx, dropId);

    if (!drop) {
      throw new AppError("Drop not found", 404, "DROP_NOT_FOUND");
    }

    const dbNow = await getDatabaseNow(tx);

    if (drop.starts_at > dbNow) {
      throw new AppError("Drop has not started yet", 409, "DROP_NOT_STARTED");
    }

    if (drop.ends_at && drop.ends_at <= dbNow) {
      throw new AppError("Drop has ended", 409, "DROP_ENDED");
    }

    if (drop.available_stock <= 0) {
      throw new AppError("Sold out", 409, "SOLD_OUT");
    }

    const activeReservation = await tx.reservation.findFirst({
      where: {
        userId,
        dropId,
        status: ReservationStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (activeReservation) {
      throw new AppError(
        "You already have an active reservation for this drop",
        409,
        "ACTIVE_RESERVATION_EXISTS",
      );
    }

    const updatedDrop = await tx.drop.update({
      where: {
        id: dropId,
      },
      data: {
        availableStock: {
          decrement: 1,
        },
        ...(drop.available_stock - 1 === 0
          ? { status: DropStatus.SOLD_OUT }
          : {}),
      },
      select: {
        id: true,
        title: true,
        totalStock: true,
        availableStock: true,
        status: true,
        startsAt: true,
        endsAt: true,
      },
    });

    const expiresAt = new Date(dbNow.getTime() + RESERVATION_WINDOW_MS);

    const reservation = await tx.reservation.create({
      data: {
        userId,
        dropId,
        expiresAt,
        status: ReservationStatus.ACTIVE,
      },
      select: {
        id: true,
        userId: true,
        dropId: true,
        status: true,
        reservedAt: true,
        expiresAt: true,
      },
    });

    return {
      drop: updatedDrop,
      reservation,
    };
  });
};

export const completeReservationPurchase = async (
  userId: string,
  reservationId: string,
): Promise<PurchaseResult> => {
  return prisma.$transaction(async (tx) => {
    const reservation = await lockReservationById(tx, reservationId);

    if (!reservation) {
      throw new AppError("Reservation not found", 404, "RESERVATION_NOT_FOUND");
    }

    if (reservation.user_id !== userId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new AppError(
        "Reservation is no longer active",
        409,
        "RESERVATION_NOT_ACTIVE",
      );
    }

    const dbNow = await getDatabaseNow(tx);

    if (reservation.expires_at <= dbNow) {
      throw new AppError("Reservation has expired", 409, "RESERVATION_EXPIRED");
    }

    const alreadyPurchased = await purchaseExistsByReservationId(
      tx,
      reservationId,
    );

    if (alreadyPurchased) {
      throw new AppError(
        "Reservation has already been purchased",
        409,
        "RESERVATION_ALREADY_PURCHASED",
      );
    }

    const purchase = await tx.purchase.create({
      data: {
        userId,
        dropId: reservation.drop_id,
        reservationId,
        status: "SUCCESS",
      },
      select: {
        id: true,
        userId: true,
        dropId: true,
        reservationId: true,
        status: true,
        purchasedAt: true,
      },
    });

    const completedAt = new Date();

    const completedReservation = await tx.reservation.update({
      where: {
        id: reservationId,
      },
      data: {
        status: ReservationStatus.COMPLETED,
        completedAt,
      },
      select: {
        id: true,
        status: true,
        completedAt: true,
      },
    });

    return {
      purchase,
      reservation: completedReservation,
    };
  });
};
