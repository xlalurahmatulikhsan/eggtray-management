import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/app-error.js";

export async function createAttendance(data: {
  employeeId: string;
  date: Date;
  status: "PRESENT" | "ABSENT" | "REPLACED" | "HOLIDAY";
  notes?: string;
}) {
  const employee = await prisma.employee.findUnique({
    where: {
      id: data.employeeId,
    },
  });

  if (!employee) {
    throw new AppError("Employee not found", 404, "EMPLOYEE_NOT_FOUND");
  }

  const existingAttendance = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: data.employeeId,
        date: data.date,
      },
    },
  });

  if (existingAttendance) {
    throw new AppError(
      "Attendance already exists for this employee on this date",
      409,
      "ATTENDANCE_ALREADY_EXISTS",
    );
  }

  return prisma.attendance.create({
    data: {
      employeeId: data.employeeId,
      date: data.date,
      status: data.status,
      notes: data.notes,
    },
    include: {
      employee: true,
    },
  });
}

export async function getAttendanceById(id: string) {
  const attendance = await prisma.attendance.findUnique({
    where: {
      id,
    },
    include: {
      employee: true,
    },
  });

  if (!attendance) {
    throw new AppError("Attendance not found", 404, "ATTENDANCE_NOT_FOUND");
  }

  return attendance;
}

export async function getAttendances() {
  return prisma.attendance.findMany({
    orderBy: [
      {
        date: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    include: {
      employee: true,
    },
  });
}

export async function updateAttendance(
  id: string,
  data: {
    status?: "PRESENT" | "ABSENT" | "REPLACED" | "HOLIDAY";
    notes?: string;
  },
) {
  const attendance = await prisma.attendance.findUnique({
    where: {
      id,
    },
  });

  if (!attendance) {
    throw new AppError("Attendance not found", 404, "ATTENDANCE_NOT_FOUND");
  }

  return prisma.attendance.update({
    where: {
      id,
    },
    data,
    include: {
      employee: true,
    },
  });
}
