// Unified page initialization helper
// Runs callback on initial page load and on Turbo navigation

export function onReady(callback) {
  // Initial page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
  } else {
    callback();
  }

  // Turbo navigation
  document.addEventListener("turbo:load", callback);
}
