import { z } from "zod";

export const createPayrollPeriodSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const createPayrollDailySchema = z.object({
  payrollPeriodId: z.string().min(1),

  date: z.coerce.date(),

  dayType: z.enum(["NORMAL", "HOLIDAY", "RAIN", "CUSTOM"]),

  productionBundles: z.number().int().nonnegative().optional(),

  pcsPerBundle: z.number().int().positive().optional(),

  teamAFullEmployeeIds: z.array(z.string().min(1)).default([]),

  teamAHalfEmployeeIds: z.array(z.string().min(1)).default([]),

  teamARainAmount: z.number().nonnegative().optional(),

  notes: z.string().max(500).optional(),
});
