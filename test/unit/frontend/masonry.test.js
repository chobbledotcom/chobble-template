import { test } from "bun:test";

// Importing masonry.js triggers onReady which queries for .items.masonry
// containers. With no containers on the page, it should return early
// without error.
test("masonry module loads without error when no containers exist", async () => {
  const masonry = await import("#public/masonry.js");
  // onReady finds 0 containers and returns — import should not throw
  void masonry;
});
