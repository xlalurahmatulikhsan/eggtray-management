import { FastifyInstance } from "fastify";

import {
  editAttendance,
  listAttendance,
  showAttendance,
  storeAttendance,
} from "./attendance.controller.js";

export async function attendanceRoutes(app: FastifyInstance) {
  app.get("/attendance", listAttendance);

  app.get("/attendance/:id", showAttendance);

  app.post("/attendance", storeAttendance);

  app.patch("/attendance/:id", editAttendance);
}
