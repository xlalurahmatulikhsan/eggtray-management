import { FastifyReply, FastifyRequest } from "fastify";

import {
  createProduct,
  getProductById,
  getProducts,
  updateProduct,
} from "./product.service.js";

import {
  createProductSchema,
  updateProductSchema,
} from "./product.schema.js";

export async function listProducts() {
  const products = await getProducts();

  return {
    success: true,
    data: products,
  };
}

export async function showProduct(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
) {
  const product = await getProductById(
    request.params.id,
  );

  return {
    success: true,
    data: product,
  };
}

export async function storeProduct(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = createProductSchema.safeParse(
    request.body,
  );

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

  const product = await createProduct(result.data);

  return reply.status(201).send({
    success: true,
    data: product,
    message: "Product created successfully",
  });
}

export async function editProduct(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply,
) {
  const result = updateProductSchema.safeParse(
    request.body,
  );

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

  const product = await updateProduct(
    request.params.id,
    result.data,
  );

  return {
    success: true,
    data: product,
    message: "Product updated successfully",
  };
}