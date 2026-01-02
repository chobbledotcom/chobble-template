// Shuffle properties on property listing pages using a seeded random
// The seed is stored in localStorage and expires after 24 hours

import { onReady } from "#assets/on-ready.js";

const STORAGE_KEY = "property_order_seed";
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Pure seeded random: returns [randomValue, nextSeed]
const nextRandom = (seed) => {
  const newSeed = (seed * 13 + 17) % 1000;
  return [newSeed / 1000, newSeed];
};

// Pure Fisher-Yates shuffle using recursion
const shuffleArray = (array, seed) => {
  const shuffle = (arr, index, currentSeed) =>
    index <= 0
      ? arr
      : ((randomResult) =>
          ((j) =>
            shuffle(
              arr.map((item, idx) =>
                idx === index ? arr[j] : idx === j ? arr[index] : item,
              ),
              index - 1,
              randomResult[1],
            ))(Math.floor(randomResult[0] * (index + 1))))(
          nextRandom(currentSeed),
        );

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

  shuffled.forEach((item) => {
    itemsList.appendChild(item);
  });
  itemsList.dataset.shuffled = "true";
};

onReady(initPropertyShuffle);
