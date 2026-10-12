import { describe, expect, it } from "vitest";

import {
  calculateTeamAPay,
  calculateTeamBPay,
  calculateRainTeamAPay,
  distributeTeamAPay,
} from "./payroll.calculator.js";

describe("Payroll Calculator", () => {
  describe("calculateTeamAPay", () => {
    it("menghitung gaji Team A dengan benar", () => {
      const result = calculateTeamAPay({
        productionBundles: 140,
        pcsPerBundle: 50,
        pricePerPcs: 130,
        divisor: 5,
        fullWorkerCount: 4,
        halfWorkerCount: 2,
      });

      expect(result.productionPcs).toBe(7000);
      expect(result.productionValue).toBe(910000);
      expect(result.baseAmount).toBe(182000);
      expect(result.fullWorkerAmount).toBe(182000);
      expect(result.halfWorkerAmount).toBe(91000);
      expect(result.totalWorkerAmount).toBe(910000);
    });

    it("mendukung ukuran ikat 70 pcs", () => {
      const result = calculateTeamAPay({
        productionBundles: 100,
        pcsPerBundle: 70,
        pricePerPcs: 130,
        divisor: 5,
        fullWorkerCount: 5,
        halfWorkerCount: 0,
      });

      expect(result.productionPcs).toBe(7000);
      expect(result.baseAmount).toBe(182000);
      expect(result.totalWorkerAmount).toBe(910000);
    });

    it("menolak jumlah produksi nol", () => {
      expect(() =>
        calculateTeamAPay({
          productionBundles: 0,
          pcsPerBundle: 50,
          pricePerPcs: 130,
          divisor: 5,
          fullWorkerCount: 4,
          halfWorkerCount: 2,
        }),
      ).toThrow();
    });
  });

  describe("calculateTeamBPay", () => {
    it("menghitung gaji berdasarkan jumlah pekerja", () => {
      const result = calculateTeamBPay({
        dailyRate: 30000,
        presentCount: 5,
        replacementCount: 1,
      });

      expect(result.totalAmount).toBe(180000);
    });

    it("menolak jumlah pekerja negatif", () => {
      expect(() =>
        calculateTeamBPay({
          dailyRate: 30000,
          presentCount: -1,
          replacementCount: 0,
        }),
      ).toThrow();
    });
  });

  describe("distributeTeamAPay", () => {
    it("membagi nominal full dan half dengan benar", () => {
      const result = distributeTeamAPay(182000, [
        { employeeId: "A1", isHalfPay: false },
        { employeeId: "A2", isHalfPay: true },
      ]);

      expect(result).toEqual([
        {
          employeeId: "A1",
          amount: 182000,
          isHalfPay: false,
        },
        {
          employeeId: "A2",
          amount: 91000,
          isHalfPay: true,
        },
      ]);
    });

    it("menolak daftar pekerja kosong", () => {
      expect(() => distributeTeamAPay(182000, [])).toThrow();
    });
  });

  describe("calculateRainTeamAPay", () => {
    it("menerima nominal manual untuk hari hujan", () => {
      const result = calculateRainTeamAPay(500000);

      expect(result.amount).toBe(500000);
      expect(result.isManualOverride).toBe(true);
    });

    it("menolak nominal negatif", () => {
      expect(() => calculateRainTeamAPay(-1000)).toThrow();
    });
  });
});
