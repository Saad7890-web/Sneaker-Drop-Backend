import { z } from "zod";

export const reservationIdParamSchema = z.object({
  reservationId: z.string().cuid("Invalid reservation id"),
});
