import { describe, expect, it } from "vitest";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "./employee.schema.js";

describe("createEmployeeSchema", () => {
  it("trims employee name", () => {
    const result = createEmployeeSchema.safeParse({
      name: "  Budi  ",
      team: "TEAM_A",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.name).toBe("Budi");
    }
  });

  it("rejects a name containing only spaces", () => {
    const result = createEmployeeSchema.safeParse({
      name: "   ",
      team: "TEAM_A",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a name longer than 100 characters", () => {
    const result = createEmployeeSchema.safeParse({
      name: "A".repeat(101),
      team: "TEAM_A",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateEmployeeSchema", () => {
  it("rejects an empty update", () => {
    expect(updateEmployeeSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a valid partial update", () => {
    const result = updateEmployeeSchema.safeParse({
      team: "TEAM_B",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a whitespace-only name", () => {
    const result = updateEmployeeSchema.safeParse({
      name: "   ",
    });

    expect(result.success).toBe(false);
  });
});
