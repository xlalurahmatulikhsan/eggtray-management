import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(100),

  pcsPerBundle: z.number().int().positive().default(50),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),

  pcsPerBundle: z.number().int().positive().optional(),

  isActive: z.boolean().optional(),
});
