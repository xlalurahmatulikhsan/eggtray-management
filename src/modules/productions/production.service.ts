import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/app-error.js";

export async function createProduction(data: {
  productId: string;
  date: Date;
  bundleQuantity: number;
  notes?: string;
}) {
  const product = await prisma.product.findUnique({
    where: {
      id: data.productId,
    },
  });

  if (!product) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  if (!product.isActive) {
    throw new AppError("Product is inactive", 400, "PRODUCT_INACTIVE");
  }

  const pcsQuantity = data.bundleQuantity * product.pcsPerBundle;

  return prisma.$transaction(async (tx) => {
    const production = await tx.production.create({
      data: {
        productId: data.productId,
        date: data.date,
        bundleQuantity: data.bundleQuantity,
        pcsQuantity,
        notes: data.notes,
      },
    });

    await tx.stockTransaction.create({
      data: {
        productId: data.productId,
        type: "PRODUCTION",
        bundleQuantity: data.bundleQuantity,
        pcsQuantity,
        referenceId: production.id,
        notes: `Production ${production.id}`,
      },
    });

    const finishedStock = await tx.finishedStock.upsert({
      where: {
        productId: data.productId,
      },

      create: {
        productId: data.productId,
        bundleQuantity: data.bundleQuantity,
        pcsQuantity,
      },

      update: {
        bundleQuantity: {
          increment: data.bundleQuantity,
        },

        pcsQuantity: {
          increment: pcsQuantity,
        },
      },
    });

    return {
      production,
      finishedStock,
    };
  });
}
