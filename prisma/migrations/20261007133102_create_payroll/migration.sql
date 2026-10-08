/*
  Warnings:

  - The `status` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `team` on the `Employee` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmployeeTeam" AS ENUM ('TEAM_A', 'TEAM_B');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "PayrollDayType" AS ENUM ('NORMAL', 'HOLIDAY', 'RAIN', 'CUSTOM');

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "team",
ADD COLUMN     "team" "EmployeeTeam" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollDailyRecord" (
    "id" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dayType" "PayrollDayType" NOT NULL DEFAULT 'NORMAL',
    "productionBundles" INTEGER,
    "pcsPerBundle" INTEGER,
    "teamAAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "teamBAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollDailyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollEmployeeDetail" (
    "id" TEXT NOT NULL,
    "dailyRecordId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "replacedEmployeeId" TEXT,
    "attendanceStatus" "AttendanceStatus",
    "baseAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "deductionAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bonusAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isReplacement" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollEmployeeDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollSetting" (
    "id" TEXT NOT NULL,
    "teamAPricePerPcs" DECIMAL(65,30) NOT NULL DEFAULT 130,
    "teamADivisor" DECIMAL(65,30) NOT NULL DEFAULT 5,
    "teamBDailyRate" DECIMAL(65,30) NOT NULL DEFAULT 30000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollPeriod_startDate_idx" ON "PayrollPeriod"("startDate");

-- CreateIndex
CREATE INDEX "PayrollPeriod_endDate_idx" ON "PayrollPeriod"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_startDate_endDate_key" ON "PayrollPeriod"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "PayrollDailyRecord_date_idx" ON "PayrollDailyRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollDailyRecord_payrollPeriodId_date_key" ON "PayrollDailyRecord"("payrollPeriodId", "date");

-- CreateIndex
CREATE INDEX "PayrollEmployeeDetail_employeeId_idx" ON "PayrollEmployeeDetail"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollEmployeeDetail_replacedEmployeeId_idx" ON "PayrollEmployeeDetail"("replacedEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollEmployeeDetail_dailyRecordId_employeeId_key" ON "PayrollEmployeeDetail"("dailyRecordId", "employeeId");

-- AddForeignKey
ALTER TABLE "PayrollDailyRecord" ADD CONSTRAINT "PayrollDailyRecord_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmployeeDetail" ADD CONSTRAINT "PayrollEmployeeDetail_dailyRecordId_fkey" FOREIGN KEY ("dailyRecordId") REFERENCES "PayrollDailyRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEmployeeDetail" ADD CONSTRAINT "PayrollEmployeeDetail_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
