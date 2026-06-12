import type { Prisma } from "../generated/prisma/client";

export type DropRow = {
  id: string;
  title: string;
  total_stock: number;
  available_stock: number;
  status: string;
  starts_at: Date;
  ends_at: Date | null;
};

export const lockDropById = async (
  tx: Prisma.TransactionClient,
  dropId: string,
): Promise<DropRow | null> => {
  const rows = await tx.$queryRaw<DropRow[]>`
    SELECT id, title, total_stock, available_stock, status, starts_at, ends_at
    FROM drops
    WHERE id = ${dropId}
    FOR UPDATE
  `;

  return rows[0] ?? null;
};
