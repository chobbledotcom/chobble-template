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

/**
 * Submit a form via fetch, returning { ok, url, error }.
 * Uses manual redirect handling to avoid cross-origin redirect errors
 * when posting to external form services (e.g. Formspark).
 * @param {HTMLFormElement} form - The form element to submit
 * @param {string} [redirectUrl] - URL to navigate to on success
 * @returns {Promise<{ ok: boolean, url: string, error: Error|null }>}
 */
const submitForm = async (form, redirectUrl = "") => {
  try {
    const response = await fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      redirect: "manual",
    });
    // An opaqueredirect means the server accepted the submission and
    // responded with a redirect — this is the expected success path
    // for external form services like Formspark.
    if (response.type === "opaqueredirect" || response.ok) {
      return { ok: true, url: redirectUrl || response.url, error: null };
    }
    return {
      ok: false,
      url: response.url,
      error: new Error(`Server responded with ${response.status}`),
    };
  } catch (err) {
    return { ok: false, url: "", error: err };
  }
};

export { fetchJson, postJson, submitForm };
