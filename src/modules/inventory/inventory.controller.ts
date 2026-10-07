import { FastifyReply, FastifyRequest } from "fastify";

import {
  adjustmentStockSchema,
  damageStockSchema,
  inventoryTransactionQuerySchema,
} from "./inventory.schema.js";

import {
  adjustStock,
  damageStock,
  getAllInventory,
  getInventoryByProduct,
  getInventoryTransactions,
} from "./inventory.service.js";

export async function listInventory(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const inventory = await getAllInventory();

  return reply.send({
    success: true,
    data: inventory,
  });
}

export async function showInventory(
  request: FastifyRequest<{
    Params: {
      productId: string;
    };
  }>,
  reply: FastifyReply,
) {
  const stock = await getInventoryByProduct(request.params.productId);

  return reply.send({
    success: true,
    data: stock,
  });
}

export async function listInventoryTransactions(
  request: FastifyRequest<{
    Params: {
      productId: string;
    };
    Querystring: {
      limit?: string;
    };
  }>,
  reply: FastifyReply,
) {
  const query = inventoryTransactionQuerySchema.parse(request.query);

  const transactions = await getInventoryTransactions(
    request.params.productId,
    query.limit,
  );

  return reply.send({
    success: true,
    data: transactions,
  });
}

export async function damageInventory(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const data = damageStockSchema.parse(request.body);

  const transaction = await damageStock(
    data.productId,
    data.bundleQuantity,
    data.notes,
  );

  return reply.code(201).send({
    success: true,
    data: transaction,
  });
}

export async function adjustInventory(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const data = adjustmentStockSchema.parse(request.body);

  const transaction = await adjustStock(
    data.productId,
    data.type,
    data.bundleQuantity,
    data.notes,
  );

  return reply.code(201).send({
    success: true,
    data: transaction,
  });
}
