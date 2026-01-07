#!/usr/bin/env bun
/**
 * Parse a Chrome CPU profile and generate a text report
 * Usage: bun profile-report.js <profile.cpuprofile> <output.txt> <project-dir>
 */

const [profilePath, outputPath, projectDir] = process.argv.slice(2);

if (!profilePath || !outputPath || !projectDir) {
  console.error(
    "Usage: bun profile-report.js <profile.cpuprofile> <output.txt> <project-dir>",
  );
  process.exit(1);
}

const profile = await Bun.file(profilePath).json();

// Build node lookup map
const nodes = new Map(
  profile.nodes.map((node) => [
    node.id,
    {
      functionName: node.callFrame.functionName || "(anonymous)",
      url: node.callFrame.url || "",
      lineNumber: node.callFrame.lineNumber,
      hitCount: node.hitCount || 0,
    },
  ]),
);

// Aggregate stats by function+location, excluding node_modules
const stats = new Map();
const projectPrefix = `file://${projectDir}/`;

for (const node of profile.nodes) {
  const info = nodes.get(node.id);
  const url = info.url.replace(projectPrefix, "");

  // Skip internals and dependencies
  if (!url || url.startsWith("node:") || url.includes("node_modules")) continue;

  const location = `${url}:${info.lineNumber + 1}`;
  const key = `${info.functionName}|${location}`;

  if (!stats.has(key)) {
    stats.set(key, {
      functionName: info.functionName,
      location,
      hitCount: 0,
      selfTime: 0,
    });
  }
  stats.get(key).hitCount += info.hitCount;
}

// Calculate self-time from samples
const sampleInterval = profile.samples?.length
  ? (profile.endTime - profile.startTime) / profile.samples.length
  : 0;

for (const nodeId of profile.samples || []) {
  const info = nodes.get(nodeId);
  if (!info) continue;

  const url = info.url.replace(projectPrefix, "");
  if (!url || url.startsWith("node:") || url.includes("node_modules")) continue;

  const location = `${url}:${info.lineNumber + 1}`;
  const key = `${info.functionName}|${location}`;
  if (stats.has(key)) {
    stats.get(key).selfTime += sampleInterval;
  }
}

// Sort by self-time descending
const sorted = [...stats.values()]
  .filter((s) => s.selfTime > 0 || s.hitCount > 0)
  .sort((a, b) => b.selfTime - a.selfTime)
  .slice(0, 50);

// Generate report
const lines = [
  "ELEVENTY BUILD PROFILE REPORT",
  "=".repeat(80),
  "",
  "Top functions by self-time (your code only, excludes node_modules):",
  "",
  "Self Time (ms) | Hit Count | Function                       | Location",
  "-".repeat(80),
];

for (const stat of sorted) {
  const time = (stat.selfTime / 1000).toFixed(2).padStart(13);
  const hits = String(stat.hitCount).padStart(9);
  const fn = stat.functionName.slice(0, 30).padEnd(30);
  lines.push(`${time} | ${hits} | ${fn} | ${stat.location}`);
}

lines.push(
  "",
  "=".repeat(80),
  "",
  "To visualize the full profile:",
  "  1. Open Chrome DevTools -> Performance tab",
  '  2. Click "Load profile..." button',
  "  3. Select: .profile/build.cpuprofile",
  "",
  "Or use: bunx speedscope .profile/build.cpuprofile",
);

const report = lines.join("\n");
await Bun.write(outputPath, report);
console.log(report);
