import { z } from "zod";

export const cuidParamSchema = z.object({
  id: z.string().cuid("Invalid identifier"),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
