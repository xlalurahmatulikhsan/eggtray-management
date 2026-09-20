import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().min(1).max(100),
  team: z.enum(["TEAM_A", "TEAM_B"]),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  team: z.enum(["TEAM_A", "TEAM_B"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
