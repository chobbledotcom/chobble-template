const PLACEHOLDER_COLORS = [
  "green",
  "blue",
  "pink",
  "yellow",
  "purple",
  "orange",
];

/** @param {string} itemPath */
const getPlaceholderForPath = (itemPath) => {
  const hash = Math.abs(
    [...itemPath].reduce(
      (hash, char) => (hash * 31 + char.charCodeAt(0)) | 0,
      0,
    ),
  );
  const color = PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
  return `images/placeholders/${color}.svg`;
};

export { getPlaceholderForPath };
