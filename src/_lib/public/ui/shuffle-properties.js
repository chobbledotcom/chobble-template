// Shuffle properties on property listing pages using a seeded random
// The seed is stored in localStorage and expires after 24 hours

import { onReady } from "#public/utils/on-ready.js";

const STORAGE_KEY = "property_order_seed";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

onReady(() => {
  if (!document.body.classList.contains("properties")) return;

  const itemsList = document.querySelector("ul.items");
  if (!itemsList) return;
  if (itemsList.dataset.shuffled) return;

  const items = Array.from(itemsList.children);
  if (items.length <= 1) return;

  // Get or create seed
  const stored = localStorage.getItem(STORAGE_KEY);
  const now = Date.now();
  const seed =
    stored && now - Number.parseInt(stored, 10) < EXPIRY_MS
      ? Number.parseInt(stored, 10)
      : (() => {
          localStorage.setItem(STORAGE_KEY, now.toString());
          return now;
        })();

  // Pure Fisher-Yates shuffle using recursion
  const shuffle = (arr, index, currentSeed) => {
    if (index <= 0) return arr;
    // Pure seeded random: returns [randomValue, nextSeed]
    const nextSeed = (currentSeed * 13 + 17) % 1000;
    const randomValue = nextSeed / 1000;
    const j = Math.floor(randomValue * (index + 1));
    // Swap indices
    const swapped = arr.map((item, idx) =>
      idx === index ? arr[j] : idx === j ? arr[index] : item,
    );
    return shuffle(swapped, index - 1, nextSeed);
  };

  const shuffled = shuffle([...items], items.length - 1, seed);

  for (const item of shuffled) {
    itemsList.appendChild(item);
  }
  itemsList.dataset.shuffled = "true";
});
