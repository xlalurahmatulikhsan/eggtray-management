import { AppError } from "../../utils/app-error.js";

export interface TeamACalculationInput {
  productionBundles: number;
  pcsPerBundle: number;
  pricePerPcs: number;
  divisor: number;
  fullWorkerCount: number;
  halfWorkerCount: number;
}

export interface TeamACalculationResult {
  productionPcs: number;
  productionValue: number;
  baseAmount: number;
  fullWorkerAmount: number;
  halfWorkerAmount: number;
  totalWorkerAmount: number;
}

export function calculateTeamAPay(
  input: TeamACalculationInput,
): TeamACalculationResult {
  if (input.productionBundles <= 0) {
    throw new AppError(
      "Jumlah produksi harus lebih dari 0",
      400,
      "INVALID_PRODUCTION",
    );
  }

  if (input.pcsPerBundle <= 0) {
    throw new AppError(
      "Jumlah pcs per ikat harus lebih dari 0",
      400,
      "INVALID_PCS_PER_BUNDLE",
    );
  }

  if (input.pricePerPcs <= 0) {
    throw new AppError(
      "Harga per pcs harus lebih dari 0",
      400,
      "INVALID_PRICE_PER_PCS",
    );
  }

  if (input.divisor <= 0) {
    throw new AppError("Pembagi harus lebih dari 0", 400, "INVALID_DIVISOR");
  }

  const productionPcs = input.productionBundles * input.pcsPerBundle;

  const productionValue = productionPcs * input.pricePerPcs;

  const baseAmount = productionValue / input.divisor;

  const fullWorkerAmount = baseAmount;

  const halfWorkerAmount = baseAmount / 2;

  const totalWorkerAmount =
    fullWorkerAmount * input.fullWorkerCount +
    halfWorkerAmount * input.halfWorkerCount;

  return {
    productionPcs,
    productionValue,
    baseAmount,
    fullWorkerAmount,
    halfWorkerAmount,
    totalWorkerAmount,
  };
}

export interface TeamBCalculationInput {
  dailyRate: number;
  presentCount: number;
  replacementCount: number;
}

export interface TeamBCalculationResult {
  dailyRate: number;
  presentCount: number;
  replacementCount: number;
  totalAmount: number;
}

export function calculateTeamBPay(
  input: TeamBCalculationInput,
): TeamBCalculationResult {
  if (input.dailyRate < 0) {
    throw new AppError(
      "Upah harian tidak boleh negatif",
      400,
      "INVALID_DAILY_RATE",
    );
  }

  if (input.presentCount < 0) {
    throw new AppError(
      "Jumlah pekerja hadir tidak valid",
      400,
      "INVALID_PRESENT_COUNT",
    );
  }

  if (input.replacementCount < 0) {
    throw new AppError(
      "Jumlah pekerja pengganti tidak valid",
      400,
      "INVALID_REPLACEMENT_COUNT",
    );
  }

  const totalWorkerCount = input.presentCount + input.replacementCount;

  const totalAmount = totalWorkerCount * input.dailyRate;

  return {
    dailyRate: input.dailyRate,
    presentCount: input.presentCount,
    replacementCount: input.replacementCount,
    totalAmount,
  };
}

export interface TeamAWorker {
  employeeId: string;
  isHalfPay: boolean;
}

export interface TeamAWorkerResult {
  employeeId: string;
  amount: number;
  isHalfPay: boolean;
}

export function distributeTeamAPay(
  baseAmount: number,
  workers: TeamAWorker[],
): TeamAWorkerResult[] {
  if (workers.length === 0) {
    throw new AppError("Tidak ada pekerja Team A", 400, "NO_TEAM_A_WORKERS");
  }

  return workers.map((worker) => {
    const amount = worker.isHalfPay ? baseAmount / 2 : baseAmount;

    return {
      employeeId: worker.employeeId,
      amount,
      isHalfPay: worker.isHalfPay,
    };
  });
}

export function calculateRainTeamAPay(amount: number) {
  if (amount < 0) {
    throw new AppError(
      "Nominal gaji tidak boleh negatif",
      400,
      "INVALID_RAIN_PAY",
    );
  }

  return {
    amount,
    isManualOverride: true,
  };
}
