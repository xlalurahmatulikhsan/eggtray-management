import { FastifyReply, FastifyRequest } from "fastify";

import {
  getPayrollSettings,
  updatePayrollSettings,
} from "./payroll-settings.service.js";

import { updatePayrollSettingsSchema } from "./payroll-settings.schema.js";

export async function showPayrollSettings(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const settings = await getPayrollSettings();

  return reply.send({
    success: true,
    data: settings,
  });
}

export async function updateSettings(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const input = updatePayrollSettingsSchema.parse(request.body);

  const settings = await updatePayrollSettings(input);

  return reply.send({
    success: true,
    data: settings,
  });
}
