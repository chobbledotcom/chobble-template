// Unified page initialization helper
// Runs callback on initial page load and on Turbo navigation
// turbo:load fires on both initial page load and navigation, so we only need that

export function onReady(callback) {
  document.addEventListener("turbo:load", callback);
}
