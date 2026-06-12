import type { Prisma } from "../generated/prisma/client";

export const purchaseExistsByReservationId = async (
  tx: Prisma.TransactionClient,
  reservationId: string,
): Promise<boolean> => {
  const purchase = await tx.purchase.findUnique({
    where: { reservationId },
    select: { id: true },
  });

  return Boolean(purchase);
};
