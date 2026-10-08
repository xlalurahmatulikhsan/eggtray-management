-- AlterTable
ALTER TABLE "PayrollDailyRecord" ADD COLUMN     "teamAManualOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teamARainAmount" DECIMAL(65,30);
