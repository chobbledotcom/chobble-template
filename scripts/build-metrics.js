import os from "node:os";

/**
 * @typedef {{ idle: number, total: number, logicalCpuCount: number }} CpuSnapshot
 */

/** @param {import("node:os").CpuInfo["times"]} times */
const sumTimes = (times) =>
  times.user + times.nice + times.sys + times.idle + times.irq;

const getCpuSnapshot = (cpus = os.cpus()) => {
  if (cpus.length === 0) {
    throw new Error("CPU usage is unavailable: no logical CPUs were reported");
  }

  return cpus.reduce(
    (snapshot, cpu) => {
      snapshot.idle += cpu.times.idle;
      snapshot.total += sumTimes(cpu.times);
      return snapshot;
    },
    { idle: 0, total: 0, logicalCpuCount: cpus.length },
  );
};

/**
 * @param {CpuSnapshot} start
 * @param {CpuSnapshot} end
 */
const calculateAverageCpuUsage = (start, end) => {
  const idle = end.idle - start.idle;
  const total = end.total - start.total;
  if (total <= 0 || idle < 0 || idle > total) {
    throw new Error("CPU usage is unavailable: invalid CPU time delta");
  }

  const percentage = ((total - idle) / total) * 100;
  return {
    percentage,
    busyCores: (percentage / 100) * end.logicalCpuCount,
    logicalCpuCount: end.logicalCpuCount,
  };
};

/**
 * @param {{ percentage: number, busyCores: number, logicalCpuCount: number }} usage
 */
const formatAverageCpuUsage = ({ percentage, busyCores, logicalCpuCount }) =>
  `Average system CPU usage: ${percentage.toFixed(1)}% ` +
  `(${busyCores.toFixed(1)} of ${logicalCpuCount} logical CPUs)`;

export { calculateAverageCpuUsage, formatAverageCpuUsage, getCpuSnapshot };
