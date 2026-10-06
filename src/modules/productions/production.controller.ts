import { FastifyReply, FastifyRequest } from "fastify";

import { createProduction } from "./production.service.js";

import { createProductionSchema } from "./production.schema.js";

export async function storeProduction(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = createProductionSchema.safeParse(request.body);

  if (!result.success) {
    return reply.status(400).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: result.error.flatten(),
      },
    });
  }

  const resultData = await createProduction(result.data);

  return reply.status(201).send({
    success: true,
    data: resultData,
    message: "Production recorded successfully",
  });
}
