// ntfy push notifications for debugging
// Sends fire-and-forget notifications to ntfy.sh when errors occur.
// Fully defensive: never throws, never blocks, silently no-ops on failure.

import Config from "#public/utils/config.js";

const NTFY_BASE_URL = "https://ntfy.sh";

/**
 * Send a notification to the configured ntfy channel.
 * No-ops silently if ntfy_channel is not configured or if the request fails.
 *
 * @param {string} message - The notification message
 */
export const sendNtfyNotification = (message) => {
  if (!Config.ntfy_channel) return;

  const body = `[${window.location.hostname}] ${message}`;

  fetch(`${NTFY_BASE_URL}/${Config.ntfy_channel}`, {
    method: "POST",
    body,
  }).catch(() => {
    // Intentionally swallowed - ntfy failures must never propagate
  });
};
