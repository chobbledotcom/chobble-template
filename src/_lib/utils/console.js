// Console wrapper utility
// Controls when console output is allowed:
// - Server-side (Node.js during build): Always allowed
// - Client-side (browser): Only allowed in serve mode (localhost)

// Detect Node.js environment (works even when happy-dom provides window)
const isNodeJs =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

// In browser, only allow console in serve mode (localhost)
const isServeMode = () => {
  if (isNodeJs) return true;
  if (typeof location === "undefined") return false;
  return (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === ""
  );
};

/** @param {...unknown} args */
export const log = (...args) => {
  if (isServeMode()) {
    // biome-ignore lint/suspicious/noConsole: controlled console wrapper
    console.log(...args);
  }
};

/** @param {...unknown} args */
export const error = (...args) => {
  if (isServeMode()) {
    // biome-ignore lint/suspicious/noConsole: controlled console wrapper
    console.error(...args);
  }
};
