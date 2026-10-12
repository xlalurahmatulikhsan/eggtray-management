import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";

describe("Employees API integration", () => {
  const app = buildApp();
  let employeeId: string | undefined;

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    // Bersihkan hanya data yang dibuat oleh tes ini.
    if (employeeId) {
      await app.inject({
        method: "DELETE",
        url: `/api/employees/${employeeId}`,
      });
    }

    await app.close();
  });

  it("membuat karyawan baru", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/employees",
      payload: {
        name: "Integration Test Employee",
        team: "TEAM_A",
      },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();
    const employee = body.data ?? body;

    expect(employee.name).toBe("Integration Test Employee");
    expect(employee.team).toBe("TEAM_A");
    expect(employee.id).toBeTruthy();

    employeeId = employee.id;
  });

  it("mengambil data karyawan yang baru dibuat", async () => {
    expect(employeeId).toBeTruthy();

    const response = await app.inject({
      method: "GET",
      url: `/api/employees/${employeeId}`,
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    const employee = body.data ?? body;

    expect(employee.id).toBe(employeeId);
    expect(employee.name).toBe("Integration Test Employee");
  });
});
