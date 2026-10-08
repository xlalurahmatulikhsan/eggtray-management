import { z } from "zod";

export const createAttendanceSchema = z.object({
  employeeId: z.string().min(1),
  date: z.coerce.date(),

  status: z.enum(["PRESENT", "ABSENT", "REPLACED", "HOLIDAY"]),

  replacementEmployeeId: z.string().min(1).optional(),

  notes: z.string().max(500).optional(),
});

export const updateAttendanceSchema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "REPLACED", "HOLIDAY"]).optional(),

  replacementEmployeeId: z.string().min(1).optional(),

  notes: z.string().max(500).optional(),
});
