// HTTP client library
// Centralized error handling for fetch requests

/**
 * Fetch JSON from a URL, returning null on any error.
 * Handles both network errors and non-OK HTTP responses.
 *
 * @param {string} url - The URL to fetch
 * @returns {Promise<object|null>} The JSON response, or null on error
 */
const fetchJson = async (url) => {
  try {
    const response = await fetch(url);
    return response.ok ? response.json() : null;
  } catch (_err) {
    return null;
  }
};

/**
 * Post JSON to a URL, returning the response or null on error.
 *
 * @param {string} url - The URL to post to
 * @param {object} data - The data to send as JSON
 * @returns {Promise<object|null>} The JSON response, or null on error
 */
const postJson = async (url, data) => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.ok ? response.json() : null;
  } catch (_err) {
    return null;
  }
};

export { fetchJson, postJson };
