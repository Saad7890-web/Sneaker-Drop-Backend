import prisma from "../config/prisma";
import {
  DropStatus,
  Prisma,
  ReservationStatus,
} from "../generated/prisma/client";

type DueReservationRow = {
  id: string;
  drop_id: string;
  user_id: string;
};

type LockedDropRow = {
  id: string;
  available_stock: number;
  ends_at: Date | null;
};

export type ExpiredReservationEvent = {
  reservationId: string;
  dropId: string;
  userId: string;
  expiredAt: string;
  availableStock: number;
  status: string;
};

export const expireDueReservationsBatch = async (
  batchSize = 100,
): Promise<ExpiredReservationEvent[]> => {
  return prisma.$transaction(async (tx) => {
    const dueReservations = await tx.$queryRaw<DueReservationRow[]>`
      SELECT id, drop_id, user_id
      FROM reservations
      WHERE status = 'ACTIVE'
        AND expires_at <= NOW()
      ORDER BY expires_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `;

    if (dueReservations.length === 0) {
      return [];
    }

    const now = new Date();

    for (const reservation of dueReservations) {
      await tx.reservation.update({
        where: {
          id: reservation.id,
        },
        data: {
          status: ReservationStatus.EXPIRED,
        },
      });
    }

    const dropIds = [
      ...new Set(dueReservations.map((reservation) => reservation.drop_id)),
    ];

    const lockedDrops = await tx.$queryRaw<LockedDropRow[]>`
      SELECT id, available_stock, ends_at
      FROM drops
      WHERE id IN (${Prisma.join(dropIds)})
      FOR UPDATE
    `;

    const lockedDropMap = new Map(
      lockedDrops.map((drop) => [drop.id, drop] as const),
    );

    const countsByDropId = new Map<string, number>();
    for (const reservation of dueReservations) {
      countsByDropId.set(
        reservation.drop_id,
        (countsByDropId.get(reservation.drop_id) ?? 0) + 1,
      );
    }

    const events: ExpiredReservationEvent[] = [];

    for (const [dropId, count] of countsByDropId.entries()) {
      const lockedDrop = lockedDropMap.get(dropId);

      if (!lockedDrop) {
        continue;
      }

      const restoredStock = lockedDrop.available_stock + count;

      const nextStatus =
        lockedDrop.ends_at && lockedDrop.ends_at <= now
          ? DropStatus.ENDED
          : restoredStock > 0
            ? DropStatus.ACTIVE
            : DropStatus.SOLD_OUT;

      const updatedDrop = await tx.drop.update({
        where: {
          id: dropId,
        },
        data: {
          availableStock: restoredStock,
          status: nextStatus,
        },
        select: {
          id: true,
          availableStock: true,
          status: true,
        },
      });

      const expiredReservationsForDrop = dueReservations.filter(
        (reservation) => reservation.drop_id === dropId,
      );

      for (const reservation of expiredReservationsForDrop) {
        events.push({
          reservationId: reservation.id,
          dropId,
          userId: reservation.user_id,
          expiredAt: now.toISOString(),
          availableStock: updatedDrop.availableStock,
          status: updatedDrop.status,
        });
      }
    }

    return events;
  });
};
