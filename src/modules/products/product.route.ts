import { FastifyInstance } from "fastify";

import {
  editProduct,
  listProducts,
  showProduct,
  storeProduct,
} from "./product.controller.js";

export async function productRoutes(app: FastifyInstance) {
  app.get("/products", listProducts);

  app.get("/products/:id", showProduct);

  app.post("/products", storeProduct);

  app.patch("/products/:id", editProduct);
}
