import type { Prisma } from "../generated/prisma/client";

export type ReservationRow = {
  id: string;
  user_id: string;
  drop_id: string;
  status: string;
  reserved_at: Date;
  expires_at: Date;
  completed_at: Date | null;
};

export const lockReservationById = async (
  tx: Prisma.TransactionClient,
  reservationId: string,
): Promise<ReservationRow | null> => {
  const rows = await tx.$queryRaw<ReservationRow[]>`
    SELECT id, user_id, drop_id, status, reserved_at, expires_at, completed_at
    FROM reservations
    WHERE id = ${reservationId}
    FOR UPDATE
  `;

  return rows[0] ?? null;
};
