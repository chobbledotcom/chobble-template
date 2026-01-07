/**
 * Pure functional math utilities
 */

/**
 * Greatest common divisor using Euclidean algorithm
 *
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Greatest common divisor
 *
 * @example
 * gcd(12, 8)   // 4
 * gcd(1920, 1080) // 120
 */
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/**
 * Simplify a ratio to its lowest terms
 *
 * Reduces a ratio (like width/height) by dividing both values
 * by their greatest common divisor.
 *
 * @param {number} a - First value (e.g., width)
 * @param {number} b - Second value (e.g., height)
 * @returns {string} Simplified ratio as "a/b"
 *
 * @example
 * simplifyRatio(1920, 1080) // "16/9"
 * simplifyRatio(1600, 1600) // "1/1"
 * simplifyRatio(800, 600)   // "4/3"
 */
const simplifyRatio = (a, b) => {
  const divisor = gcd(a, b);
  return `${a / divisor}/${b / divisor}`;
};

export { simplifyRatio };
