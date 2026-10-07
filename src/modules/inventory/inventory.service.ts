import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/app-error.js";

export async function getAllInventory() {
  return prisma.finishedStock.findMany({
    include: {
      product: true,
    },
    orderBy: {
      product: {
        name: "asc",
      },
    },
  });
}

export async function getInventoryByProduct(productId: string) {
  const stock = await prisma.finishedStock.findUnique({
    where: {
      productId,
    },
    include: {
      product: true,
    },
  });

  if (!stock) {
    throw new AppError("Stok produk tidak ditemukan", 404, "STOCK_NOT_FOUND");
  }

  return stock;
}

export async function getInventoryTransactions(
  productId: string,
  limit: number,
) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    throw new AppError("Produk tidak ditemukan", 404, "PRODUCT_NOT_FOUND");
  }

  return prisma.stockTransaction.findMany({
    where: {
      productId,
    },
    include: {
      product: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

export async function damageStock(
  productId: string,
  bundleQuantity: number,
  notes?: string,
) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    throw new AppError("Produk tidak ditemukan", 404, "PRODUCT_NOT_FOUND");
  }

  const pcsQuantity = bundleQuantity * product.pcsPerBundle;

  return prisma.$transaction(async (tx) => {
    const stock = await tx.finishedStock.findUnique({
      where: {
        productId,
      },
    });

    if (!stock) {
      throw new AppError("Stok produk tidak ditemukan", 404, "STOCK_NOT_FOUND");
    }

    if (
      stock.bundleQuantity < bundleQuantity ||
      stock.pcsQuantity < pcsQuantity
    ) {
      throw new AppError("Stok tidak mencukupi", 400, "INSUFFICIENT_STOCK");
    }

    const transaction = await tx.stockTransaction.create({
      data: {
        productId,
        type: "DAMAGE",
        bundleQuantity: -bundleQuantity,
        pcsQuantity: -pcsQuantity,
        notes,
      },
    });

    await tx.finishedStock.update({
      where: {
        productId,
      },
      data: {
        bundleQuantity: {
          decrement: bundleQuantity,
        },
        pcsQuantity: {
          decrement: pcsQuantity,
        },
      },
    });

    return transaction;
  });
}

export async function adjustStock(
  productId: string,
  type: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT",
  bundleQuantity: number,
  notes?: string,
) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    throw new AppError("Produk tidak ditemukan", 404, "PRODUCT_NOT_FOUND");
  }

  const pcsQuantity = bundleQuantity * product.pcsPerBundle;

  return prisma.$transaction(async (tx) => {
    const stock = await tx.finishedStock.findUnique({
      where: {
        productId,
      },
    });

    if (!stock) {
      throw new AppError("Stok produk tidak ditemukan", 404, "STOCK_NOT_FOUND");
    }

    if (type === "ADJUSTMENT_OUT") {
      if (
        stock.bundleQuantity < bundleQuantity ||
        stock.pcsQuantity < pcsQuantity
      ) {
        throw new AppError("Stok tidak mencukupi", 400, "INSUFFICIENT_STOCK");
      }
    }

    const signedBundleQuantity =
      type === "ADJUSTMENT_IN" ? bundleQuantity : -bundleQuantity;

    const signedPcsQuantity =
      type === "ADJUSTMENT_IN" ? pcsQuantity : -pcsQuantity;

    const transaction = await tx.stockTransaction.create({
      data: {
        productId,
        type,
        bundleQuantity: signedBundleQuantity,
        pcsQuantity: signedPcsQuantity,
        notes,
      },
    });

    if (type === "ADJUSTMENT_IN") {
      await tx.finishedStock.update({
        where: {
          productId,
        },
        data: {
          bundleQuantity: {
            increment: bundleQuantity,
          },
          pcsQuantity: {
            increment: pcsQuantity,
          },
        },
      });
    } else {
      await tx.finishedStock.update({
        where: {
          productId,
        },
        data: {
          bundleQuantity: {
            decrement: bundleQuantity,
          },
          pcsQuantity: {
            decrement: pcsQuantity,
          },
        },
      });
    }

    return transaction;
  });
}
