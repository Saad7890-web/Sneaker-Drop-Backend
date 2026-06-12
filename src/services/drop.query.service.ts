import {
  fetchActiveDropsPage,
  fetchDropById,
  fetchRecentBuyersByDropIds,
} from "../repositories/drop.query.repository";
import { AppError } from "../utils/AppError";

type RecentBuyer = {
  username: string;
  purchasedAt: string;
};

type DropCard = {
  id: string;
  title: string;
  totalStock: number;
  availableStock: number;
  status: string;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  recentBuyers: RecentBuyer[];
};

export const listActiveDrops = async (page: number, limit: number) => {
  const { items, hasMore } = await fetchActiveDropsPage(page, limit);
  const dropIds = items.map((drop) => drop.id);
  const recentBuyersRows = await fetchRecentBuyersByDropIds(dropIds);

  const buyersByDropId = new Map<string, RecentBuyer[]>();

  for (const row of recentBuyersRows) {
    const current = buyersByDropId.get(row.drop_id) ?? [];
    current.push({
      username: row.username,
      purchasedAt: row.purchased_at.toISOString(),
    });
    buyersByDropId.set(row.drop_id, current);
  }

  const drops: DropCard[] = items.map((drop) => ({
    id: drop.id,
    title: drop.title,
    totalStock: drop.totalStock,
    availableStock: drop.availableStock,
    status: drop.status,
    startsAt: drop.startsAt.toISOString(),
    endsAt: drop.endsAt ? drop.endsAt.toISOString() : null,
    createdAt: drop.createdAt.toISOString(),
    updatedAt: drop.updatedAt.toISOString(),
    recentBuyers: buyersByDropId.get(drop.id) ?? [],
  }));

  return {
    items: drops,
    pageInfo: {
      page,
      limit,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
    },
  };
};

export const getDropDetails = async (dropId: string) => {
  const drop = await fetchDropById(dropId);

  if (!drop) {
    throw new AppError("Drop not found", 404, "DROP_NOT_FOUND");
  }

  const recentBuyersRows = await fetchRecentBuyersByDropIds([drop.id]);

  const recentBuyers = recentBuyersRows.map((row) => ({
    username: row.username,
    purchasedAt: row.purchased_at.toISOString(),
  }));

  return {
    id: drop.id,
    title: drop.title,
    totalStock: drop.totalStock,
    availableStock: drop.availableStock,
    status: drop.status,
    startsAt: drop.startsAt.toISOString(),
    endsAt: drop.endsAt ? drop.endsAt.toISOString() : null,
    createdAt: drop.createdAt.toISOString(),
    updatedAt: drop.updatedAt.toISOString(),
    recentBuyers,
  };
};
