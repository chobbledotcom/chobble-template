// Shuffle properties on property listing pages using a seeded random
// The seed is stored in localStorage and expires after 24 hours

import { onReady } from "./on-ready.js";

const STORAGE_KEY = "property_order_seed";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Simple seeded PRNG (mulberry32)
function seededRandom(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle with seeded random
function shuffleArray(array, random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getSeed() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const seed = parseInt(stored, 10);
    const now = Date.now();
    // Check if seed is still valid (less than 24 hours old)
    if (now - seed < EXPIRY_MS) {
      return seed;
    }
  }
  // Create new seed
  const newSeed = Date.now();
  localStorage.setItem(STORAGE_KEY, newSeed.toString());
  return newSeed;
}

function isPropertyPage() {
  return document.body.classList.contains("properties");
}

function initPropertyShuffle() {
  if (!isPropertyPage()) return;

  const itemsList = document.querySelector("ul.items");
  if (!itemsList) return;

  // Avoid re-shuffling if already done
  if (itemsList.dataset.shuffled) return;

  const items = Array.from(itemsList.children);
  if (items.length <= 1) return;

  const seed = getSeed();
  const random = seededRandom(seed);
  const shuffled = shuffleArray(items, random);

  // Re-append in shuffled order
  shuffled.forEach((item) => itemsList.appendChild(item));
  itemsList.dataset.shuffled = "true";
}

onReady(initPropertyShuffle);
