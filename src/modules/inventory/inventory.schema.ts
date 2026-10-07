import { z } from "zod";

export const inventoryQuerySchema = z.object({
  productId: z.string().min(1).optional(),
});

export const inventoryTransactionQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const damageStockSchema = z.object({
  productId: z.string().min(1),
  bundleQuantity: z.number().int().positive(),
  notes: z.string().max(500).optional(),
});

export const adjustmentStockSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["ADJUSTMENT_IN", "ADJUSTMENT_OUT"]),
  bundleQuantity: z.number().int().positive(),
  notes: z.string().max(500).optional(),
});
