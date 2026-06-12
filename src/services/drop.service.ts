import prisma from "../config/prisma";
import { DropStatus } from "../generated/prisma/client";
import { AppError } from "../utils/AppError";

type CreateDropInput = {
  title: string;
  totalStock: number;
  startsAt: Date;
  endsAt?: Date;
};

export const createDrop = async (input: CreateDropInput) => {
  const now = new Date();

  if (input.endsAt && input.endsAt <= now) {
    throw new AppError(
      "endsAt must be in the future",
      400,
      "INVALID_DROP_WINDOW",
    );
  }

  const initialStatus =
    input.startsAt > now ? DropStatus.SCHEDULED : DropStatus.ACTIVE;

  return prisma.drop.create({
    data: {
      title: input.title,
      totalStock: input.totalStock,
      availableStock: input.totalStock,
      status: initialStatus,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
    },
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
