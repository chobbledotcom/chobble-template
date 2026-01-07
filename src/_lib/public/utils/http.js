// HTTP client library
// Centralized error handling for fetch requests

/**
 * Safely execute a fetch request, returning JSON on success or null on error.
 * @param {Promise<Response>} fetchPromise - The fetch promise to execute
 * @returns {Promise<object|null>} The JSON response, or null on error
 */
const safeFetch = async (fetchPromise) => {
  try {
    const response = await fetchPromise;
    return response.ok ? response.json() : null;
  } catch (_err) {
    return null;
  }
};

/**
 * Fetch JSON from a URL, returning null on any error.
 * Handles both network errors and non-OK HTTP responses.
 *
 * @param {string} url - The URL to fetch
 * @returns {Promise<object|null>} The JSON response, or null on error
 */
const fetchJson = (url) => safeFetch(fetch(url));

/**
 * Post JSON to a URL, returning the response or null on error.
 *
 * @param {string} url - The URL to post to
 * @param {object} data - The data to send as JSON
 * @returns {Promise<object|null>} The JSON response, or null on error
 */
const postJson = (url, data) =>
  safeFetch(
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );

export { fetchJson, postJson };
