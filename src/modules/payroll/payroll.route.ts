import { FastifyInstance } from "fastify";

import {
  calculatePayroll,
  deletePayrollDailyController,
  finalizePayroll,
  listPayrollPeriods,
  payrollReport,
  showPayrollPeriod,
  storePayrollDaily,
  storePayrollPeriod,
  updatePayrollDailyController,
} from "./payroll.controller.js";

import {
  showPayrollSettings,
  updateSettings,
} from "./settings/payroll-settings.controller.js";

export async function payrollRoutes(app: FastifyInstance) {
  app.get("/payroll/periods", listPayrollPeriods);

  app.get("/payroll/periods/:id", showPayrollPeriod);

  app.post("/payroll/periods", storePayrollPeriod);

  app.post("/payroll/daily", storePayrollDaily);

  app.post("/payroll/periods/:id/calculate", calculatePayroll);

  app.post("/payroll/periods/:id/finalize", finalizePayroll);

  app.get("/payroll/periods/:id/report", payrollReport);

  app.get("/payroll/settings", showPayrollSettings);

  app.patch("/payroll/settings", updateSettings);

  app.patch("/payroll/daily/:id", updatePayrollDailyController);

  app.delete("/payroll/daily/:id", deletePayrollDailyController);
}
