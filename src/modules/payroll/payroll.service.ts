import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { Prisma, AttendanceStatus } from "../../../generated/prisma/client.js";

import {
  calculateRainTeamAPay,
  calculateTeamAPay,
  distributeTeamAPay,
} from "./payroll.calculator.js";

import { UpdatePayrollDailyInput } from "./payroll.schema.js";
import { getPayrollSettings } from "./settings/payroll-settings.service.js";

interface CreatePayrollDailyInput {
  payrollPeriodId: string;
  date: Date;
  dayType: "NORMAL" | "HOLIDAY" | "RAIN" | "CUSTOM";
  productionBundles?: number;
  pcsPerBundle?: number;
  teamAFullEmployeeIds: string[];
  teamAHalfEmployeeIds: string[];
  teamARainAmount?: number;
  notes?: string;
}

interface PayrollEmployeeDetailInput {
  employeeId: string;
  replacedEmployeeId: string | null;
  attendanceStatus: AttendanceStatus | null;
  baseAmount: number;
  deductionAmount: number;
  bonusAmount: number;
  finalAmount: number;
  isReplacement: boolean;
  notes: string | null;
}

function normalizeDate(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export async function createPayrollPeriod(startDate: Date, endDate: Date) {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (start > end) {
    throw new AppError(
      "Tanggal mulai tidak boleh setelah tanggal selesai",
      400,
      "INVALID_PAYROLL_PERIOD",
    );
  }

  const existing = await prisma.payrollPeriod.findUnique({
    where: {
      startDate_endDate: {
        startDate: start,
        endDate: end,
      },
    },
  });

  if (existing) {
    throw new AppError(
      "Periode payroll sudah ada",
      409,
      "PAYROLL_PERIOD_ALREADY_EXISTS",
    );
  }

  return prisma.payrollPeriod.create({
    data: {
      startDate: start,
      endDate: end,
    },
  });
}

export async function getPayrollPeriods() {
  return prisma.payrollPeriod.findMany({
    include: {
      dailyRecords: {
        orderBy: {
          date: "asc",
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });
}

export async function getPayrollPeriodById(id: string) {
  const period = await prisma.payrollPeriod.findUnique({
    where: {
      id,
    },
    include: {
      dailyRecords: {
        include: {
          employeeDetails: {
            include: {
              employee: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  if (!period) {
    throw new AppError(
      "Periode payroll tidak ditemukan",
      404,
      "PAYROLL_PERIOD_NOT_FOUND",
    );
  }

  return period;
}

export async function createPayrollDaily(input: CreatePayrollDailyInput) {
  const period = await prisma.payrollPeriod.findUnique({
    where: {
      id: input.payrollPeriodId,
    },
  });

  if (!period) {
    throw new AppError(
      "Periode payroll tidak ditemukan",
      404,
      "PAYROLL_PERIOD_NOT_FOUND",
    );
  }

  if (period.status === "FINALIZED") {
    throw new AppError(
      "Periode payroll sudah difinalisasi",
      400,
      "PAYROLL_PERIOD_FINALIZED",
    );
  }

  const date = normalizeDate(input.date);

  if (date < period.startDate || date > period.endDate) {
    throw new AppError(
      "Tanggal payroll berada di luar periode",
      400,
      "DATE_OUTSIDE_PAYROLL_PERIOD",
    );
  }

  const existing = await prisma.payrollDailyRecord.findUnique({
    where: {
      payrollPeriodId_date: {
        payrollPeriodId: input.payrollPeriodId,
        date,
      },
    },
  });

  if (existing) {
    throw new AppError(
      "Payroll untuk tanggal tersebut sudah dibuat",
      409,
      "PAYROLL_DAILY_ALREADY_EXISTS",
    );
  }

  const settings = await prisma.payrollSetting.findFirst();

  if (!settings) {
    throw new AppError(
      "Payroll setting belum tersedia",
      400,
      "PAYROLL_SETTING_NOT_FOUND",
    );
  }

  return prisma.$transaction(async (tx) => {
    const employees = await tx.employee.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const employeeMap = new Map(
      employees.map((employee) => [employee.id, employee]),
    );

    // ==========================================
    // VALIDASI TEAM A
    // ==========================================

    const teamAIds = [
      ...input.teamAFullEmployeeIds,
      ...input.teamAHalfEmployeeIds,
    ];

    const uniqueTeamAIds = new Set(teamAIds);

    if (uniqueTeamAIds.size !== teamAIds.length) {
      throw new AppError(
        "Karyawan Team A tidak boleh muncul lebih dari satu kali",
        400,
        "DUPLICATE_TEAM_A_EMPLOYEE",
      );
    }

    for (const employeeId of teamAIds) {
      const employee = employeeMap.get(employeeId);

      if (!employee) {
        throw new AppError(
          `Karyawan ${employeeId} tidak ditemukan`,
          404,
          "EMPLOYEE_NOT_FOUND",
        );
      }

      if (employee.team !== "TEAM_A") {
        throw new AppError(
          `${employee.name} bukan anggota Team A`,
          400,
          "INVALID_TEAM_A_EMPLOYEE",
        );
      }
    }

    // ==========================================
    // VALIDASI PRODUKSI
    // ==========================================

    let teamAAmount = 0;
    let teamAManualOverride = false;
    let teamARainAmount: number | null = null;

    let productionPcs = 0;

    // Distribution Team A akan digunakan oleh
    // NORMAL maupun RAIN untuk membuat detail
    let teamADistribution: {
      employeeId: string;
      amount: number;
      isHalfPay: boolean;
    }[] = [];

    // ==========================================
    // RAIN
    // ==========================================

    if (input.dayType === "RAIN") {
      if (input.teamARainAmount === undefined || input.teamARainAmount <= 0) {
        throw new AppError(
          "Nominal Team A saat hujan wajib diisi dan harus lebih dari 0",
          400,
          "RAIN_AMOUNT_REQUIRED",
        );
      }

      const rain = calculateRainTeamAPay(input.teamARainAmount);

      // Distribusikan nominal hujan ke karyawan Team A
      teamADistribution = distributeManualTeamAPay(
        input.teamARainAmount,
        input.teamAFullEmployeeIds,
        input.teamAHalfEmployeeIds,
      );

      teamAAmount = rain.amount;
      teamAManualOverride = true;
      teamARainAmount = rain.amount;
    }

    // ==========================================
    // NORMAL
    // ==========================================
    else if (input.dayType === "NORMAL") {
      if (
        input.productionBundles === undefined ||
        input.pcsPerBundle === undefined
      ) {
        throw new AppError(
          "Produksi dan pcs per ikat wajib diisi untuk hari normal",
          400,
          "PRODUCTION_DATA_REQUIRED",
        );
      }

      if (input.productionBundles <= 0 || input.pcsPerBundle <= 0) {
        throw new AppError(
          "Produksi dan pcs per ikat harus lebih dari 0",
          400,
          "INVALID_PRODUCTION_DATA",
        );
      }

      const calculation = calculateTeamAPay({
        productionBundles: input.productionBundles,

        pcsPerBundle: input.pcsPerBundle,

        pricePerPcs: Number(settings.teamAPricePerPcs),

        divisor: Number(settings.teamADivisor),

        fullWorkerCount: input.teamAFullEmployeeIds.length,

        halfWorkerCount: input.teamAHalfEmployeeIds.length,
      });

      teamAAmount = calculation.totalWorkerAmount;

      productionPcs = calculation.productionPcs;

      // ==========================================
      // DISTRIBUSI TEAM A NORMAL
      // ==========================================

      const baseAmount =
        (productionPcs * Number(settings.teamAPricePerPcs)) /
        Number(settings.teamADivisor);

      const workers = [
        ...input.teamAFullEmployeeIds.map((employeeId) => ({
          employeeId,
          isHalfPay: false,
        })),

        ...input.teamAHalfEmployeeIds.map((employeeId) => ({
          employeeId,
          isHalfPay: true,
        })),
      ];

      teamADistribution = distributeTeamAPay(baseAmount, workers);
    }

    // ==========================================
    // ATTENDANCE
    // ==========================================

    const attendance = await tx.attendance.findMany({
      where: {
        date,
      },
    });

    const attendanceMap = new Map(
      attendance.map((item) => [item.employeeId, item]),
    );

    // ==========================================
    // TEAM A DETAIL
    // ==========================================

    let teamADetails: PayrollEmployeeDetailInput[] = [];

    // NORMAL dan RAIN sama-sama membuat detail Team A
    if (input.dayType === "NORMAL" || input.dayType === "RAIN") {
      if (teamAIds.length === 0) {
        throw new AppError(
          "Team A belum dipilih",
          400,
          "TEAM_A_WORKERS_REQUIRED",
        );
      }

      teamADetails = teamADistribution.map((item) => {
        const attendanceRecord = attendanceMap.get(item.employeeId);

        const status = attendanceRecord?.status ?? "ABSENT";

        return {
          employeeId: item.employeeId,

          attendanceStatus: status,

          baseAmount: item.amount,

          deductionAmount: 0,

          bonusAmount: 0,

          finalAmount: status === "PRESENT" ? item.amount : 0,

          isReplacement: false,

          replacedEmployeeId: null,

          notes: item.isHalfPay ? "Porsi setengah" : "Porsi penuh",
        };
      });
    }

    // ==========================================
    // TEAM B
    // ==========================================

    const teamBEmployees = employees.filter(
      (employee) => employee.team === "TEAM_B",
    );

    const teamBDetails = teamBEmployees.map((employee) => {
      const attendanceRecord = attendanceMap.get(employee.id);

      const status = attendanceRecord?.status ?? "ABSENT";

      const isPresent = status === "PRESENT";

      return {
        employeeId: employee.id,

        attendanceStatus: status,

        baseAmount: isPresent ? Number(settings.teamBDailyRate) : 0,

        deductionAmount: 0,

        bonusAmount: 0,

        finalAmount: isPresent ? Number(settings.teamBDailyRate) : 0,

        isReplacement: false,

        replacedEmployeeId: null,

        notes: null,
      };
    });

    // ==========================================
    // REPLACEMENT
    // ==========================================

    const replacementDetails = await buildReplacementDetails(
      tx,
      date,
      employeeMap,
      settings,
    );

    // ==========================================
    // CREATE DAILY RECORD
    // ==========================================

    const dailyRecord = await tx.payrollDailyRecord.create({
      data: {
        payrollPeriodId: input.payrollPeriodId,

        date,

        dayType: input.dayType,

        productionBundles: input.productionBundles ?? null,

        pcsPerBundle: input.pcsPerBundle ?? null,

        teamAAmount,

        teamBAmount:
          teamBDetails.reduce((total, item) => total + item.finalAmount, 0) +
          replacementDetails.reduce(
            (total, item) => total + item.finalAmount,
            0,
          ),

        teamAManualOverride,

        teamARainAmount,

        notes: input.notes,
      },
    });

    // ==========================================
    // CREATE EMPLOYEE DETAILS
    // ==========================================

    const details = [...teamADetails, ...teamBDetails, ...replacementDetails];

    if (details.length > 0) {
      await tx.payrollEmployeeDetail.createMany({
        data: details.map((item) => ({
          dailyRecordId: dailyRecord.id,

          employeeId: item.employeeId,

          attendanceStatus: item.attendanceStatus,

          baseAmount: item.baseAmount,

          deductionAmount: item.deductionAmount,

          bonusAmount: item.bonusAmount,

          finalAmount: item.finalAmount,

          isReplacement: item.isReplacement,

          replacedEmployeeId: item.replacedEmployeeId,

          notes: item.notes,
        })),
      });
    }

    // ==========================================
    // RETURN
    // ==========================================

    return tx.payrollDailyRecord.findUnique({
      where: {
        id: dailyRecord.id,
      },
      include: {
        employeeDetails: {
          include: {
            employee: true,
          },
        },
      },
    });
  });
}

function distributeManualTeamAPay(
  totalAmount: number,
  fullEmployeeIds: string[],
  halfEmployeeIds: string[],
) {
  const totalWeight = fullEmployeeIds.length + halfEmployeeIds.length * 0.5;

  if (totalWeight <= 0) {
    throw new AppError(
      "Pekerja Team A belum ditentukan",
      400,
      "TEAM_A_WORKERS_REQUIRED",
    );
  }

  const unitAmount = totalAmount / totalWeight;

  return [
    ...fullEmployeeIds.map((employeeId) => ({
      employeeId,
      amount: unitAmount,
      isHalfPay: false,
    })),

    ...halfEmployeeIds.map((employeeId) => ({
      employeeId,
      amount: unitAmount / 2,
      isHalfPay: true,
    })),
  ];
}

async function buildReplacementDetails(
  tx: Prisma.TransactionClient,
  date: Date,
  employeeMap: Map<
    string,
    {
      id: string;
      name: string;
      team: "TEAM_A" | "TEAM_B";
      status: string;
    }
  >,
  settings: {
    teamAPricePerPcs: Prisma.Decimal;
    teamADivisor: Prisma.Decimal;
    teamBDailyRate: Prisma.Decimal;
  },
) {
  const absentEmployees = await tx.attendance.findMany({
    where: {
      date,
      status: "ABSENT",
      replacementEmployeeId: {
        not: null,
      },
    },
  });

  const result: PayrollEmployeeDetailInput[] = [];

  for (const absent of absentEmployees) {
    const replacementId = absent.replacementEmployeeId;

    if (!replacementId) {
      continue;
    }

    const absentEmployee = employeeMap.get(absent.employeeId);

    if (!absentEmployee) {
      throw new AppError(
        `Karyawan yang digantikan ${absent.employeeId} tidak ditemukan`,
        404,
        "ABSENT_EMPLOYEE_NOT_FOUND",
      );
    }

    const replacementEmployee = employeeMap.get(replacementId);

    if (!replacementEmployee) {
      throw new AppError(
        "Karyawan pengganti tidak ditemukan",
        404,
        "REPLACEMENT_EMPLOYEE_NOT_FOUND",
      );
    }

    if (replacementEmployee.team !== absentEmployee.team) {
      throw new AppError(
        "Tim karyawan pengganti tidak sama dengan karyawan yang digantikan",
        400,
        "INVALID_REPLACEMENT_TEAM",
      );
    }

    const alreadyHasAttendance = await tx.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: replacementId,
          date,
        },
      },
    });

    if (alreadyHasAttendance && alreadyHasAttendance.status === "PRESENT") {
      throw new AppError(
        `${replacementEmployee.name} sudah tercatat hadir pada tanggal tersebut`,
        400,
        "REPLACEMENT_ALREADY_PRESENT",
      );
    }

    const amount =
      replacementEmployee.team === "TEAM_B"
        ? Number(settings.teamBDailyRate)
        : 0;

    result.push({
      employeeId: replacementId,

      attendanceStatus: "REPLACED",

      baseAmount: amount,

      deductionAmount: 0,

      bonusAmount: 0,

      finalAmount: amount,

      isReplacement: true,

      replacedEmployeeId: absent.employeeId,

      notes: `Menggantikan ${absentEmployee.name}`,
    });
  }

  return result;
}

export async function calculatePayrollPeriod(periodId: string) {
  const period = await prisma.payrollPeriod.findUnique({
    where: {
      id: periodId,
    },
    include: {
      dailyRecords: {
        include: {
          employeeDetails: true,
        },
      },
    },
  });

  if (!period) {
    throw new AppError(
      "Periode payroll tidak ditemukan",
      404,
      "PAYROLL_PERIOD_NOT_FOUND",
    );
  }

  if (period.status === "FINALIZED") {
    throw new AppError(
      "Payroll sudah FINALIZED",
      400,
      "PAYROLL_ALREADY_FINALIZED",
    );
  }

  const totalAmount = period.dailyRecords.reduce((periodTotal, dailyRecord) => {
    const dailyTotal = dailyRecord.employeeDetails.reduce(
      (total, detail) => total + Number(detail.finalAmount),
      0,
    );

    return periodTotal + dailyTotal;
  }, 0);

  return prisma.payrollPeriod.update({
    where: {
      id: periodId,
    },
    data: {
      totalAmount,
    },
    include: {
      dailyRecords: {
        include: {
          employeeDetails: {
            include: {
              employee: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });
}

export async function finalizePayrollPeriod(periodId: string) {
  const period = await prisma.payrollPeriod.findUnique({
    where: {
      id: periodId,
    },
    include: {
      dailyRecords: {
        include: {
          employeeDetails: true,
        },
      },
    },
  });

  if (!period) {
    throw new AppError(
      "Periode payroll tidak ditemukan",
      404,
      "PAYROLL_PERIOD_NOT_FOUND",
    );
  }

  if (period.status === "FINALIZED") {
    throw new AppError(
      "Payroll sudah FINALIZED",
      400,
      "PAYROLL_ALREADY_FINALIZED",
    );
  }

  if (period.dailyRecords.length === 0) {
    throw new AppError(
      "Belum ada data payroll harian",
      400,
      "NO_DAILY_PAYROLL",
    );
  }

  /*
   * Setiap daily record harus memiliki
   * minimal satu detail karyawan.
   */

  for (const daily of period.dailyRecords) {
    if (daily.employeeDetails.length === 0) {
      throw new AppError(
        `Payroll tanggal ${daily.date.toISOString().slice(0, 10)} belum memiliki detail karyawan`,
        400,
        "INCOMPLETE_DAILY_PAYROLL",
      );
    }
  }

  const totalAmount = period.dailyRecords.reduce((periodTotal, dailyRecord) => {
    const dailyTotal = dailyRecord.employeeDetails.reduce(
      (total, detail) => total + Number(detail.finalAmount),
      0,
    );

    return periodTotal + dailyTotal;
  }, 0);

  return prisma.payrollPeriod.update({
    where: {
      id: periodId,
    },
    data: {
      status: "FINALIZED",
      totalAmount,
      finalizedAt: new Date(),
    },
    include: {
      dailyRecords: {
        include: {
          employeeDetails: {
            include: {
              employee: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });
}

export async function getPayrollReport(periodId: string) {
  const period = await prisma.payrollPeriod.findUnique({
    where: {
      id: periodId,
    },
    include: {
      dailyRecords: {
        include: {
          employeeDetails: {
            include: {
              employee: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  if (!period) {
    throw new AppError(
      "Periode payroll tidak ditemukan",
      404,
      "PAYROLL_PERIOD_NOT_FOUND",
    );
  }

  const employeeSummary = new Map<
    string,
    {
      employeeId: string;
      employeeName: string;
      team: string;
      totalAmount: number;
      presentDays: number;
      absentDays: number;
      replacementDays: number;
    }
  >();

  let teamATotal = 0;
  let teamBTotal = 0;

  for (const dailyRecord of period.dailyRecords) {
    for (const detail of dailyRecord.employeeDetails) {
      const amount = Number(detail.finalAmount);

      if (detail.employee.team === "TEAM_A") {
        teamATotal += amount;
      }

      if (detail.employee.team === "TEAM_B") {
        teamBTotal += amount;
      }

      const existing = employeeSummary.get(detail.employeeId);

      if (!existing) {
        employeeSummary.set(detail.employeeId, {
          employeeId: detail.employeeId,

          employeeName: detail.employee.name,

          team: detail.employee.team,

          totalAmount: amount,

          presentDays: detail.attendanceStatus === "PRESENT" ? 1 : 0,

          absentDays: detail.attendanceStatus === "ABSENT" ? 1 : 0,

          replacementDays: detail.isReplacement ? 1 : 0,
        });

        continue;
      }

      existing.totalAmount += amount;

      if (detail.attendanceStatus === "PRESENT") {
        existing.presentDays++;
      }

      if (detail.attendanceStatus === "ABSENT") {
        existing.absentDays++;
      }

      if (detail.isReplacement) {
        existing.replacementDays++;
      }
    }
  }

  const totalAmount = teamATotal + teamBTotal;

  return {
    period: {
      id: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      status: period.status,
      finalizedAt: period.finalizedAt,
    },

    summary: {
      teamATotal,
      teamBTotal,
      totalAmount,
    },

    employees: Array.from(employeeSummary.values()),
  };
}

export async function updatePayrollDaily(
  dailyRecordId: string,
  input: UpdatePayrollDailyInput,
) {
  const existing = await prisma.payrollDailyRecord.findUnique({
    where: {
      id: dailyRecordId,
    },
    include: {
      payrollPeriod: true,
    },
  });

  if (!existing) {
    throw new AppError(
      "Data payroll harian tidak ditemukan",
      404,
      "PAYROLL_DAILY_NOT_FOUND",
    );
  }

  if (existing.payrollPeriod.status === "FINALIZED") {
    throw new AppError(
      "Payroll sudah FINALIZED dan tidak dapat diubah",
      400,
      "PAYROLL_ALREADY_FINALIZED",
    );
  }

  /*
   * Untuk menjaga konsistensi kalkulasi,
   * cara paling aman adalah menghapus detail lama
   * lalu membuat ulang berdasarkan input terbaru.
   */

  const dayType = input.dayType ?? existing.dayType;

  const productionBundles =
    input.productionBundles ?? existing.productionBundles ?? undefined;

  const pcsPerBundle = input.pcsPerBundle ?? existing.pcsPerBundle ?? undefined;

  const fullEmployeeIds = input.teamAFullEmployeeIds ?? [];

  const halfEmployeeIds = input.teamAHalfEmployeeIds ?? [];

  const settings = await getPayrollSettings();

  /*
   * Validasi hari normal.
   */

  if (
    dayType === "NORMAL" &&
    (productionBundles === undefined || pcsPerBundle === undefined)
  ) {
    throw new AppError(
      "Produksi dan pcs per ikat wajib diisi untuk hari normal",
      400,
      "PRODUCTION_REQUIRED",
    );
  }

  /*
   * Validasi hari hujan.
   */

  if (dayType === "RAIN" && input.teamARainAmount === undefined) {
    throw new AppError(
      "Nominal Team A untuk hari hujan wajib diisi",
      400,
      "RAIN_AMOUNT_REQUIRED",
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.payrollEmployeeDetail.deleteMany({
      where: {
        dailyRecordId,
      },
    });

    let teamAAmount = 0;

    /*
     * NORMAL
     */

    if (
      dayType === "NORMAL" &&
      productionBundles !== undefined &&
      pcsPerBundle !== undefined
    ) {
      const calculation = calculateTeamAPay({
        productionBundles,
        pcsPerBundle,
        pricePerPcs: Number(settings.teamAPricePerPcs),
        divisor: Number(settings.teamADivisor),
        fullWorkerCount: fullEmployeeIds.length,
        halfWorkerCount: halfEmployeeIds.length,
      });

      teamAAmount = calculation.baseAmount;
    }

    /*
     * RAIN
     *
     * Asumsi V1:
     * teamARainAmount adalah total dana Team A.
     *
     * pekerja full = bobot 1
     * pekerja half = bobot 0.5
     */

    if (dayType === "RAIN" && input.teamARainAmount !== undefined) {
      teamAAmount = input.teamARainAmount;
    }

    /*
     * Ambil employee Team A.
     */

    const employees = await tx.employee.findMany({
      where: {
        status: "ACTIVE",
      },
    });

    const employeeMap = new Map(
      employees.map((employee) => [employee.id, employee]),
    );

    /*
     * Validasi duplicate employee.
     */

    const selectedIds = [...fullEmployeeIds, ...halfEmployeeIds];

    if (new Set(selectedIds).size !== selectedIds.length) {
      throw new AppError(
        "Karyawan Team A tidak boleh dipilih dua kali",
        400,
        "DUPLICATE_TEAM_A_EMPLOYEE",
      );
    }

    /*
     * Validasi semua employee Team A.
     */

    for (const employeeId of selectedIds) {
      const employee = employeeMap.get(employeeId);

      if (!employee) {
        throw new AppError(
          `Karyawan ${employeeId} tidak ditemukan`,
          400,
          "EMPLOYEE_NOT_FOUND",
        );
      }

      if (employee.team !== "TEAM_A") {
        throw new AppError(
          `${employee.name} bukan anggota Team A`,
          400,
          "INVALID_TEAM_A_EMPLOYEE",
        );
      }
    }

    /*
     * Distribusi Team A.
     */

    const totalWeight = fullEmployeeIds.length + halfEmployeeIds.length * 0.5;

    if (selectedIds.length > 0 && totalWeight <= 0) {
      throw new AppError(
        "Pembagian gaji Team A tidak valid",
        400,
        "INVALID_TEAM_A_DISTRIBUTION",
      );
    }

    if (selectedIds.length > 0) {
      const unitAmount = teamAAmount / totalWeight;

      for (const employeeId of fullEmployeeIds) {
        await tx.payrollEmployeeDetail.create({
          data: {
            dailyRecordId,
            employeeId,
            attendanceStatus: "PRESENT",
            baseAmount: unitAmount,
            finalAmount: unitAmount,
            isReplacement: false,
          },
        });
      }

      for (const employeeId of halfEmployeeIds) {
        const amount = unitAmount / 2;

        await tx.payrollEmployeeDetail.create({
          data: {
            dailyRecordId,
            employeeId,
            attendanceStatus: "PRESENT",
            baseAmount: amount,
            finalAmount: amount,
            isReplacement: false,
          },
        });
      }
    }

    /*
     * Team B
     */

    const attendance = await tx.attendance.findMany({
      where: {
        date: existing.date,
      },
      include: {
        employee: true,
      },
    });

    for (const record of attendance) {
      if (
        record.employee.team !== "TEAM_B" ||
        record.employee.status !== "ACTIVE"
      ) {
        continue;
      }

      if (record.status === "PRESENT") {
        await tx.payrollEmployeeDetail.create({
          data: {
            dailyRecordId,
            employeeId: record.employeeId,
            attendanceStatus: "PRESENT",
            baseAmount: settings.teamBDailyRate,
            finalAmount: settings.teamBDailyRate,
            isReplacement: false,
          },
        });
      }
    }

    /*
     * Update daily record.
     */

    const updated = await tx.payrollDailyRecord.update({
      where: {
        id: dailyRecordId,
      },
      data: {
        dayType,

        productionBundles: productionBundles ?? null,

        pcsPerBundle: pcsPerBundle ?? null,

        teamAAmount,

        teamBAmount:
          attendance.filter(
            (item) =>
              item.employee.team === "TEAM_B" && item.status === "PRESENT",
          ).length * Number(settings.teamBDailyRate),

        teamAManualOverride: dayType === "RAIN",

        teamARainAmount:
          dayType === "RAIN" ? (input.teamARainAmount ?? null) : null,

        notes: input.notes ?? existing.notes,
      },
      include: {
        employeeDetails: {
          include: {
            employee: true,
          },
        },
      },
    });

    return updated;
  });
}

export async function deletePayrollDaily(dailyRecordId: string) {
  const existing = await prisma.payrollDailyRecord.findUnique({
    where: {
      id: dailyRecordId,
    },
    include: {
      payrollPeriod: true,
    },
  });

  if (!existing) {
    throw new AppError(
      "Data payroll harian tidak ditemukan",
      404,
      "PAYROLL_DAILY_NOT_FOUND",
    );
  }

  if (existing.payrollPeriod.status === "FINALIZED") {
    throw new AppError(
      "Payroll sudah FINALIZED dan tidak dapat dihapus",
      400,
      "PAYROLL_ALREADY_FINALIZED",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.payrollEmployeeDetail.deleteMany({
      where: {
        dailyRecordId,
      },
    });
  });

  await prisma.payrollDailyRecord.delete({
    where: {
      id: dailyRecordId,
    },
  });

  return {
    message: "Payroll harian berhasil dihapus",
  };
}
