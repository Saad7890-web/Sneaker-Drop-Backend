import { z } from "zod";

const optionalDate = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}, z.coerce.date().optional());

export const createDropSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(120, "Title is too long"),
    totalStock: z.coerce
      .number()
      .int()
      .positive("Stock must be a positive integer")
      .max(100000, "Stock is too large"),
    startsAt: z.coerce.date(),
    endsAt: optionalDate,
  })
  .refine((data) => !data.endsAt || data.endsAt > data.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export const dropIdParamSchema = z.object({
  dropId: z.string().cuid("Invalid drop id"),
});

export const listDropsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
