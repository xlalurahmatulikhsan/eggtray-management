import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/app-error.js";

export async function getProducts() {
  return prisma.product.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: {
      id,
    },
  });

  if (!product) {
    throw new AppError(
      "Product not found",
      404,
      "PRODUCT_NOT_FOUND",
    );
  }

  return product;
}

export async function createProduct(data: {
  name: string;
  pcsPerBundle: number;
}) {
  return prisma.product.create({
    data,
  });
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    pcsPerBundle?: number;
    isActive?: boolean;
  },
) {
  await getProductById(id);

  return prisma.product.update({
    where: {
      id,
    },
    data,
  });
}