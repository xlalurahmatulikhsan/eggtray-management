import { FastifyReply, FastifyRequest } from "fastify";

import {
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  getEmployees,
  updateEmployee,
} from "./employee.service.js";

import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "./employee.schema.js";

export async function listEmployees(
  _request: FastifyRequest,
  _reply: FastifyReply,
) {
  const employees = await getEmployees();

  return {
    success: true,
    data: employees,
  };
}

export async function showEmployee(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
) {
  const employee = await getEmployeeById(request.params.id);

  return {
    success: true,
    data: employee,
  };
}

export async function storeEmployee(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = createEmployeeSchema.safeParse(request.body);

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

  const employee = await createEmployee(result.data);

  return reply.status(201).send({
    success: true,
    data: employee,
    message: "Employee created successfully",
  });
}

export async function editEmployee(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply,
) {
  const result = updateEmployeeSchema.safeParse(request.body);

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

  const employee = await updateEmployee(request.params.id, result.data);

  return {
    success: true,
    data: employee,
    message: "Employee updated successfully",
  };
}

export async function removeEmployee(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
) {
  await deleteEmployee(request.params.id);

  return {
    success: true,
    message: "Employee deleted successfully",
  };
}
