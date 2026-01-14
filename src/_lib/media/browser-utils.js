import { dirname, join } from "node:path";
import { ensureDir } from "#eleventy/file-utils.js";
import { ROOT_DIR } from "#lib/paths.js";

export const BROWSER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-zygote",
];

export const DEFAULT_BASE_URL = "http://localhost:8080";
export const DEFAULT_TIMEOUT = 10000;

export const sanitizePagePath = (pagePath) =>
  pagePath.replace(/^\//, "").replace(/\/$/, "").replace(/\//g, "-") || "home";

export const prepareOutputDir = (outputPath) => {
  ensureDir(dirname(outputPath));
};

export const buildUrl = (pagePath, baseUrl) =>
  pagePath.startsWith("http")
    ? pagePath
    : `${baseUrl}${pagePath.startsWith("/") ? "" : "/"}${pagePath}`;

export const buildOutputPath = (outputDir, pagePath, suffix, extension) =>
  join(outputDir, `${sanitizePagePath(pagePath)}${suffix}.${extension}`);

export const runBatchOperations = async (items, operationFn, makeErrorInfo) => {
  const settled = await Promise.allSettled(items.map(operationFn));
  return {
    results: settled
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean),
    errors: settled
      .map((r, i) =>
        r.status === "rejected" ? makeErrorInfo(i, r.reason) : null,
      )
      .filter(Boolean),
  };
};

export const startServer = async (siteDir, port = 8080) => {
  const serverProcess = Bun.spawn(
    [
      "bun",
      "-e",
      `Bun.serve({port:${port},async fetch(req){const url=new URL(req.url);let p=url.pathname;if(p.endsWith('/'))p+='index.html';const file=Bun.file('${siteDir}'+p);const exists=await file.exists();return exists?new Response(file):new Response('Not found',{status:404})}})`,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const baseUrl = `http://localhost:${port}`;
  for (let i = 0; i < 20; i++) {
    const [result] = await Promise.allSettled([fetch(baseUrl)]);
    if (result.status === "fulfilled" && result.value.ok) break;
    await new Promise((r) => setTimeout(r, 250));
  }

  return {
    process: serverProcess,
    port,
    baseUrl,
    stop: () => serverProcess.kill(),
  };
};

export const getDefaultOutputDir = (subdir) => join(ROOT_DIR, subdir);
