import { FastifyInstance } from "fastify";

import {
  calculatePayroll,
  finalizePayroll,
  listPayrollPeriods,
  payrollReport,
  showPayrollPeriod,
  storePayrollDaily,
  storePayrollPeriod,
} from "./payroll.controller.js";

export async function payrollRoutes(app: FastifyInstance) {
  app.get("/payroll/periods", listPayrollPeriods);

  app.get("/payroll/periods/:id", showPayrollPeriod);

  app.post("/payroll/periods", storePayrollPeriod);

  app.post("/payroll/daily", storePayrollDaily);

  app.post("/payroll/periods/:id/calculate", calculatePayroll);

  app.post("/payroll/periods/:id/finalize", finalizePayroll);

  app.get("/payroll/periods/:id/report", payrollReport);
}
