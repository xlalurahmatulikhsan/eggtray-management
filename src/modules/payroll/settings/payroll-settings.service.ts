import { prisma } from "../../../lib/prisma.js";
import { AppError } from "../../../utils/app-error.js";
import type { UpdatePayrollSettingsInput } from "./payroll-settings.schema.js";

export async function getPayrollSettings() {
  let settings = await prisma.payrollSetting.findFirst();

  if (!settings) {
    settings = await prisma.payrollSetting.create({
      data: {
        teamAPricePerPcs: 130,
        teamADivisor: 5,
        teamBDailyRate: 30000,
      },
    });
  }

  return settings;
}

export async function updatePayrollSettings(input: UpdatePayrollSettingsInput) {
  const current = await getPayrollSettings();

  if (
    input.teamAPricePerPcs === undefined &&
    input.teamADivisor === undefined &&
    input.teamBDailyRate === undefined
  ) {
    throw new AppError(
      "Tidak ada pengaturan yang diubah",
      400,
      "NO_SETTINGS_TO_UPDATE",
    );
  }

  return prisma.payrollSetting.update({
    where: {
      id: current.id,
    },
    data: {
      ...(input.teamAPricePerPcs !== undefined && {
        teamAPricePerPcs: input.teamAPricePerPcs,
      }),

      ...(input.teamADivisor !== undefined && {
        teamADivisor: input.teamADivisor,
      }),

      ...(input.teamBDailyRate !== undefined && {
        teamBDailyRate: input.teamBDailyRate,
      }),
    },
  });
}
