// Shuffle properties on property listing pages using a seeded random
// The seed is stored in localStorage and expires after 24 hours

import { onReady } from "#public/utils/on-ready.js";

const STORAGE_KEY = "property_order_seed";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Pure seeded random: returns [randomValue, nextSeed]
const nextRandom = (seed) => {
  const newSeed = (seed * 13 + 17) % 1000;
  return [newSeed / 1000, newSeed];
};

// Swap two indices in an array (pure function)
const swapIndices = (arr, i, j) =>
  arr.map((item, idx) => (idx === i ? arr[j] : idx === j ? arr[i] : item));

// Pure Fisher-Yates shuffle using recursion
const shuffleArray = (array, seed) => {
  const shuffle = (arr, index, currentSeed) => {
    if (index <= 0) return arr;
    const [randomValue, nextSeed] = nextRandom(currentSeed);
    const j = Math.floor(randomValue * (index + 1));
    return shuffle(swapIndices(arr, index, j), index - 1, nextSeed);
  };

  return shuffle([...array], array.length - 1, seed);
};

const getSeed = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const now = Date.now();

  if (stored && now - parseInt(stored, 10) < EXPIRY_MS) {
    return parseInt(stored, 10);
  }

  localStorage.setItem(STORAGE_KEY, now.toString());
  return now;
};

const isPropertyPage = () => document.body.classList.contains("properties");

const initPropertyShuffle = () => {
  if (!isPropertyPage()) return;

  const itemsList = document.querySelector("ul.items");
  if (!itemsList) return;
  if (itemsList.dataset.shuffled) return;

  const items = Array.from(itemsList.children);
  if (items.length <= 1) return;

  const shuffled = shuffleArray(items, getSeed());

  for (const item of shuffled) {
    itemsList.appendChild(item);
  }
  itemsList.dataset.shuffled = "true";
};

onReady(initPropertyShuffle);
