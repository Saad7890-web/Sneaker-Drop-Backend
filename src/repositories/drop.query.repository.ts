import prisma from "../config/prisma";
import { DropStatus, Prisma } from "../generated/prisma/client";

export type RecentBuyerRow = {
  drop_id: string;
  username: string;
  purchased_at: Date;
};

export type DropListRow = {
  id: string;
  title: string;
  totalStock: number;
  availableStock: number;
  status: DropStatus;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const fetchActiveDropsPage = async (
  page: number,
  limit: number,
): Promise<{
  items: DropListRow[];
  hasMore: boolean;
}> => {
  const skip = (page - 1) * limit;
  const rows = await prisma.drop.findMany({
    where: {
      status: {
        in: [DropStatus.ACTIVE, DropStatus.SCHEDULED],
      },
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    skip,
    take: limit + 1,
    select: {
      id: true,
      title: true,
      totalStock: true,
      availableStock: true,
      status: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const hasMore = rows.length > limit;

  return {
    items: hasMore ? rows.slice(0, limit) : rows,
    hasMore,
  };
};

export const fetchDropById = async (
  dropId: string,
): Promise<DropListRow | null> => {
  return prisma.drop.findUnique({
    where: { id: dropId },
    select: {
      id: true,
      title: true,
      totalStock: true,
      availableStock: true,
      status: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const fetchRecentBuyersByDropIds = async (
  dropIds: string[],
): Promise<RecentBuyerRow[]> => {
  if (dropIds.length === 0) {
    return [];
  }

  return prisma.$queryRaw<RecentBuyerRow[]>`
    SELECT drop_id, username, purchased_at
    FROM (
      SELECT
        p.drop_id AS drop_id,
        u.username AS username,
        p.purchased_at AS purchased_at,
        ROW_NUMBER() OVER (
          PARTITION BY p.drop_id
          ORDER BY p.purchased_at DESC, p.id DESC
        ) AS rn
      FROM purchases p
      INNER JOIN users u ON u.id = p.user_id
      WHERE p.status = 'SUCCESS'
        AND p.drop_id IN (${Prisma.join(dropIds)})
    ) ranked
    WHERE ranked.rn <= 3
    ORDER BY ranked.drop_id ASC, ranked.purchased_at DESC;
  `;
};
