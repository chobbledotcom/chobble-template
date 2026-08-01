import { describe, expect, test } from "bun:test";
import {
  combinePhaseMetrics,
  createPhaseMetrics,
  formatPhaseMetrics,
} from "#scripts/build-metrics.js";

const usage = ({
  maxRSS = 1024,
  system = 500_000n,
  user = 1_500_000n,
} = {}) => ({
  cpuTime: { system, user },
  maxRSS,
});

describe("build metrics", () => {
  test("derives CPU utilization and Linux RSS for one phase", () => {
    expect(
      createPhaseMetrics({
        logicalCpuCount: 4,
        name: "Eleventy",
        platform: "linux",
        resourceUsage: usage(),
        wallMs: 2000,
      }),
    ).toEqual({
      cpuUtilization: 25,
      effectiveCores: 1,
      logicalCpuCount: 4,
      maxRssBytes: 1024 ** 2,
      name: "Eleventy",
      systemCpuMs: 500,
      totalCpuMs: 2000,
      userCpuMs: 1500,
      wallMs: 2000,
    });
  });

  test("does not scale RSS on platforms where it is already bytes", () => {
    expect(
      createPhaseMetrics({
        logicalCpuCount: 2,
        name: "Pagefind",
        platform: "darwin",
        resourceUsage: usage({ maxRSS: 12_345 }),
        wallMs: 1000,
      }).maxRssBytes,
    ).toBe(12_345);
  });

  test("combines sequential phase time and peak memory", () => {
    const first = createPhaseMetrics({
      logicalCpuCount: 4,
      name: "Eleventy",
      platform: "linux",
      resourceUsage: usage({ maxRSS: 2048 }),
      wallMs: 2000,
    });
    const second = createPhaseMetrics({
      logicalCpuCount: 4,
      name: "Pagefind",
      platform: "linux",
      resourceUsage: usage({ maxRSS: 1024, system: 0n, user: 500_000n }),
      wallMs: 1000,
    });

    expect(combinePhaseMetrics("Total build", [first, second])).toMatchObject({
      effectiveCores: 2.5 / 3,
      maxRssBytes: 2 * 1024 ** 2,
      name: "Total build",
      systemCpuMs: 500,
      totalCpuMs: 2500,
      userCpuMs: 2000,
      wallMs: 3000,
    });
  });

  test("formats phase metrics with effective cores and normalized CPU", () => {
    const metrics = createPhaseMetrics({
      logicalCpuCount: 8,
      name: "Eleventy",
      platform: "linux",
      resourceUsage: usage({ maxRSS: 1_572_864 }),
      wallMs: 2000,
    });

    expect(formatPhaseMetrics(metrics)).toBe(
      "Eleventy resources: 2.00s wall, 2.00s CPU " +
        "(1.50s user + 0.50s sys, 1.00 effective cores, 12.5% of 8), " +
        "1.50 GiB peak RSS",
    );

    expect(
      formatPhaseMetrics(
        createPhaseMetrics({
          logicalCpuCount: 8,
          name: "Pagefind",
          platform: "linux",
          resourceUsage: usage(),
          wallMs: 2000,
        }),
      ),
    ).toEndWith("1.0 MiB peak RSS");
  });

  test("rejects missing resource data and empty phase sets", () => {
    expect(() =>
      createPhaseMetrics({
        logicalCpuCount: 0,
        name: "Eleventy",
        resourceUsage: usage(),
        wallMs: 1,
      }),
    ).toThrow("no logical CPUs");
    expect(() =>
      createPhaseMetrics({ name: "Eleventy", resourceUsage: null, wallMs: 1 }),
    ).toThrow("Resource usage is unavailable");
    expect(() => combinePhaseMetrics("Total build", [])).toThrow("empty set");
  });
});
