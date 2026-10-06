import { FastifyReply, FastifyRequest } from "fastify";

import {
  createAttendance,
  getAttendanceById,
  getAttendances,
  updateAttendance,
} from "./attendance.service.js";

import {
  createAttendanceSchema,
  updateAttendanceSchema,
} from "./attendance.schema.js";

export async function listAttendance() {
  const attendance = await getAttendances();

  return {
    success: true,
    data: attendance,
  };
}

export async function showAttendance(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
) {
  const attendance = await getAttendanceById(request.params.id);

  return {
    success: true,
    data: attendance,
  };
}

export async function storeAttendance(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = createAttendanceSchema.safeParse(request.body);

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

  const attendance = await createAttendance(result.data);

  return reply.status(201).send({
    success: true,
    data: attendance,
    message: "Attendance created successfully",
  });
}

export async function editAttendance(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply,
) {
  const result = updateAttendanceSchema.safeParse(request.body);

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

  const attendance = await updateAttendance(request.params.id, result.data);

  return {
    success: true,
    data: attendance,
    message: "Attendance updated successfully",
  };
}
