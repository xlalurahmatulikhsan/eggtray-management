import Fastify from "fastify";
import { employeeRoutes } from "./modules/employess/employee.route.js";
import { AppError } from "./utils/app-error.js";
import { attendanceRoutes } from "./modules/attendance/attendance.route.js";
import { productRoutes } from "./modules/products/product.route.js";
import { productionRoutes } from "./modules/productions/production.route.js";
import { inventoryRoutes } from "./modules/inventory/inventory.route.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.get("/health", async () => {
    return {
      success: true,
      message: "EggTray Management API is running",
    };
  });

  app.register(employeeRoutes, {
    prefix: "/api",
  });

  app.register(attendanceRoutes, {
    prefix: "/api",
  });

  app.register(productRoutes, {
    prefix: "/api",
  });

  app.register(productionRoutes, {
    prefix: "/api",
  });

  app.register(inventoryRoutes, {
    prefix: "/api",
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    app.log.error(error);

    return reply.status(500).send({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  });

  return app;
}
