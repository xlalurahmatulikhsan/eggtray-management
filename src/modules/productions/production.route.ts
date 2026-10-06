import { FastifyInstance } from "fastify";

import { storeProduction } from "./production.controller.js";

export async function productionRoutes(app: FastifyInstance) {
  app.post("/productions", storeProduction);
}
