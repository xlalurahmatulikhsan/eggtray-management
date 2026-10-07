import { FastifyInstance } from "fastify";

import {
  adjustInventory,
  damageInventory,
  listInventory,
  listInventoryTransactions,
  showInventory,
} from "./inventory.controller.js";

export async function inventoryRoutes(app: FastifyInstance) {
  app.get("/inventory", listInventory);

  app.get("/inventory/:productId", showInventory);

  app.get("/inventory/:productId/transactions", listInventoryTransactions);

  app.post("/inventory/damage", damageInventory);

  app.post("/inventory/adjustment", adjustInventory);
}
