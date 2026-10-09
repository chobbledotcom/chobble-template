import { describe, expect, test } from "vitest";
import {
  calculateAverageCpuUsage,
  formatAverageCpuUsage,
  getCpuSnapshot,
} from "#scripts/build-metrics.js";

const cpu = (times) => ({
  model: "test",
  speed: 1000,
  times,
});

describe("build metrics", () => {
  test("aggregates cumulative times across logical CPUs", () => {
    const snapshot = getCpuSnapshot([
      cpu({ user: 100, nice: 10, sys: 20, idle: 300, irq: 5 }),
      cpu({ user: 200, nice: 20, sys: 40, idle: 400, irq: 10 }),
    ]);

    expect(snapshot).toEqual({
      idle: 700,
      total: 1105,
      logicalCpuCount: 2,
    });
  });

  test("calculates average utilization over the snapshot interval", () => {
    const usage = calculateAverageCpuUsage(
      { idle: 600, total: 1000, logicalCpuCount: 2 },
      { idle: 700, total: 1400, logicalCpuCount: 2 },
    );

    expect(usage).toEqual({
      percentage: 75,
      busyCores: 1.5,
      logicalCpuCount: 2,
    });
  });

  test("formats utilization as percentage and equivalent busy cores", () => {
    expect(
      formatAverageCpuUsage({
        percentage: 37.54,
        busyCores: 3.0032,
        logicalCpuCount: 8,
      }),
    ).toBe("Average system CPU usage: 37.5% (3.0 of 8 logical CPUs)");
  });

  test("rejects snapshots without elapsed CPU time", () => {
    expect(() =>
      calculateAverageCpuUsage(
        { idle: 100, total: 200, logicalCpuCount: 2 },
        { idle: 100, total: 200, logicalCpuCount: 2 },
      ),
    ).toThrow("invalid CPU time delta");
  });

  test("rejects snapshots when no logical CPUs are reported", () => {
    expect(() => getCpuSnapshot([])).toThrow("no logical CPUs were reported");
  });
});
