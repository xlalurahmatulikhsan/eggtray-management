import { FastifyReply, FastifyRequest } from "fastify";

import {
  createPayrollDailySchema,
  createPayrollPeriodSchema,
  updatePayrollDailySchema,
} from "./payroll.schema.js";

import {
  calculatePayrollPeriod,
  createPayrollDaily,
  createPayrollPeriod,
  finalizePayrollPeriod,
  getPayrollPeriodById,
  getPayrollPeriods,
  getPayrollReport,
  updatePayrollDaily,
  deletePayrollDaily,
} from "./payroll.service.js";

export async function storePayrollPeriod(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const data = createPayrollPeriodSchema.parse(request.body);

  const period = await createPayrollPeriod(data.startDate, data.endDate);

  return reply.code(201).send({
    success: true,
    data: period,
  });
}

export async function listPayrollPeriods(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const periods = await getPayrollPeriods();

  return reply.send({
    success: true,
    data: periods,
  });
}

export async function showPayrollPeriod(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply,
) {
  const period = await getPayrollPeriodById(request.params.id);

  return reply.send({
    success: true,
    data: period,
  });
}

export async function storePayrollDaily(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const data = createPayrollDailySchema.parse(request.body);

  const daily = await createPayrollDaily(data);

  return reply.code(201).send({
    success: true,
    data: daily,
  });
}

export async function calculatePayroll(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply,
) {
  const result = await calculatePayrollPeriod(request.params.id);

  return reply.send({
    success: true,
    data: result,
  });
}

export async function finalizePayroll(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply,
) {
  const result = await finalizePayrollPeriod(request.params.id);

  return reply.send({
    success: true,
    data: result,
  });
}

export async function payrollReport(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply,
) {
  const result = await getPayrollReport(request.params.id);

  return reply.send({
    success: true,
    data: result,
  });
}

export async function updatePayrollDailyController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as {
    id: string;
  };

  const input = updatePayrollDailySchema.parse(request.body);

  const result = await updatePayrollDaily(id, input);

  return reply.send({
    success: true,
    data: result,
  });
}

export async function deletePayrollDailyController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = request.params as {
    id: string;
  };

  const result = await deletePayrollDaily(id);

  return reply.send({
    success: true,
    data: result,
  });
}
