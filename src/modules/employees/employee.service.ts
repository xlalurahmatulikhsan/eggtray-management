import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/app-error.js";
import {
  EmployeeTeam,
  EmployeeStatus,
} from "../../../generated/prisma/client.js";

export async function getEmployees() {
  return prisma.employee.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getEmployeeById(id: string) {
  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
  });

  if (!employee) {
    throw new AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
  }

  return employee;
}

export async function createEmployee(data: {
  name: string;
  team: EmployeeTeam;
  status?: EmployeeStatus;
}) {
  return prisma.employee.create({
    data: {
      name: data.name,
      team: data.team,
      status: data.status ?? EmployeeStatus.ACTIVE,
    },
  });
}

export async function updateEmployee(
  id: string,
  data: {
    name?: string;
    team?: EmployeeTeam;
    status?: EmployeeStatus;
  },
) {
  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
  });

  if (!employee) {
    throw new AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
  }

  return prisma.employee.update({
    where: {
      id,
    },
    data,
  });
}

export async function deleteEmployee(id: string) {
  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
  });

  if (!employee) {
    throw new AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
  }

  return prisma.employee.delete({
    where: {
      id,
    },
  });
}
