import { z } from "zod";

export const updatePayrollSettingsSchema = z.object({
  teamAPricePerPcs: z.number().nonnegative().optional(),
  teamADivisor: z.number().positive().optional(),
  teamBDailyRate: z.number().nonnegative().optional(),
});

export type UpdatePayrollSettingsInput = z.infer<
  typeof updatePayrollSettingsSchema
>;
