import { FastifyInstance } from "fastify";

import {
  editEmployee,
  listEmployees,
  removeEmployee,
  showEmployee,
  storeEmployee,
} from "./employee.controller.js";

export async function employeeRoutes(app: FastifyInstance) {
  app.get("/employees", listEmployees);

  app.get("/employees/:id", showEmployee);

  app.post("/employees", storeEmployee);

  app.patch("/employees/:id", editEmployee);

  app.delete("/employees/:id", removeEmployee);
}
