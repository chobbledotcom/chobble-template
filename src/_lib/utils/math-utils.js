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
 * @param {{ width: number, height: number }} dimensions - Width and height
 * @returns {string} Simplified ratio as "width/height"
 *
 * @example
 * simplifyRatio({ width: 1920, height: 1080 }) // "16/9"
 * simplifyRatio({ width: 1600, height: 1600 }) // "1/1"
 * simplifyRatio({ width: 800, height: 600 })   // "4/3"
 */
const simplifyRatio = ({ width, height }) => {
  const divisor = gcd(width, height);
  return `${width / divisor}/${height / divisor}`;
};

export { simplifyRatio };
