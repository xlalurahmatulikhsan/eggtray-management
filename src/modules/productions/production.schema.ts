import { z } from "zod";

export const createProductionSchema = z.object({
  productId: z.string().min(1),

  date: z.coerce.date(),

  bundleQuantity: z.number().int().positive(),

  notes: z.string().max(500).optional(),
});
