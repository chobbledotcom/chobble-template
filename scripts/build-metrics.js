import os from "node:os";

const linuxMaxRssToBytes = (maxRss, platform) =>
  platform === "linux" ? maxRss * 1024 : maxRss;

const deriveMetrics = ({
  logicalCpuCount,
  maxRssBytes,
  name,
  systemCpuMs,
  userCpuMs,
  wallMs,
}) => {
  const totalCpuMs = userCpuMs + systemCpuMs;
  const effectiveCores = wallMs > 0 ? totalCpuMs / wallMs : 0;

  return {
    cpuUtilization: (effectiveCores / logicalCpuCount) * 100,
    effectiveCores,
    logicalCpuCount,
    maxRssBytes,
    name,
    systemCpuMs,
    totalCpuMs,
    userCpuMs,
    wallMs,
  };
};

const createPhaseMetrics = ({
  logicalCpuCount = os.availableParallelism(),
  name,
  platform = process.platform,
  resourceUsage,
  wallMs,
}) => {
  if (!resourceUsage) {
    throw new Error(`Resource usage is unavailable for ${name}`);
  }
  if (logicalCpuCount < 1) {
    throw new Error("Resource usage is unavailable: no logical CPUs reported");
  }

  return deriveMetrics({
    logicalCpuCount,
    maxRssBytes: linuxMaxRssToBytes(resourceUsage.maxRSS, platform),
    name,
    systemCpuMs: Number(resourceUsage.cpuTime.system) / 1000,
    userCpuMs: Number(resourceUsage.cpuTime.user) / 1000,
    wallMs,
  });
};

const combinePhaseMetrics = (name, phases) => {
  if (phases.length === 0) {
    throw new Error("Cannot combine an empty set of build phases");
  }

  return deriveMetrics({
    logicalCpuCount: phases[0].logicalCpuCount,
    maxRssBytes: Math.max(...phases.map(({ maxRssBytes }) => maxRssBytes)),
    name,
    systemCpuMs: phases.reduce(
      (total, { systemCpuMs }) => total + systemCpuMs,
      0,
    ),
    userCpuMs: phases.reduce((total, { userCpuMs }) => total + userCpuMs, 0),
    wallMs: phases.reduce((total, { wallMs }) => total + wallMs, 0),
  });
};

const formatBytes = (bytes) => {
  const gibibyte = 1024 ** 3;
  if (bytes >= gibibyte) return `${(bytes / gibibyte).toFixed(2)} GiB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
};

const formatPhaseMetrics = (metrics) =>
  `${metrics.name} resources: ${(metrics.wallMs / 1000).toFixed(2)}s wall, ` +
  `${(metrics.totalCpuMs / 1000).toFixed(2)}s CPU ` +
  `(${(metrics.userCpuMs / 1000).toFixed(2)}s user + ` +
  `${(metrics.systemCpuMs / 1000).toFixed(2)}s sys, ` +
  `${metrics.effectiveCores.toFixed(2)} effective cores, ` +
  `${metrics.cpuUtilization.toFixed(1)}% of ${metrics.logicalCpuCount}), ` +
  `${formatBytes(metrics.maxRssBytes)} peak RSS`;

export { combinePhaseMetrics, createPhaseMetrics, formatPhaseMetrics };
