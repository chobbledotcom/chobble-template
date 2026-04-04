// Masonry layout using @chenglou/pretext for zero-reflow height prediction.
// Cards are positioned with absolute transforms computed from font metrics alone.
import { layout, prepare } from "@chenglou/pretext";
import { onReady } from "#public/utils/on-ready.js";

const GAP = 32;
const MOBILE_BREAKPOINT = 768;
const CARD_BORDER = 2;
const CARD_PADDING_INLINE = 24;
const CARD_INNER_GAP = 16;
const BUTTON_HEIGHT = 44;
const PRICE_HEIGHT = 21;

// Review card constants (reviews-grid > li uses card($space-md) + flex-col($space-sm))
const REVIEW_PADDING = 24;
const REVIEW_HEADER_HEIGHT = 22;
const REVIEW_AUTHOR_HEIGHT = 40;
const REVIEW_PRODUCTS_HEIGHT = 18;

const CONTENT_FONT =
  '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const HEADING_FONT =
  '600 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const textHeight = (text, font, lineHeight, width) =>
  layout(prepare(text, font), width, lineHeight).height;

const sumWithGaps = (heights, gap, extraPadding) => {
  const valid = heights.filter((h) => h !== null);
  const gaps = valid.length > 1 ? gap * (valid.length - 1) : 0;
  return CARD_BORDER + valid.reduce((sum, h) => sum + h, 0) + gaps + extraPadding;
};

export const measureCard = (card, colWidth) => {
  // Review cards have a different DOM structure
  if (card.querySelector(".review-header")) {
    const contentWidth = colWidth - REVIEW_PADDING * 2;
    const reviewEl = card.querySelector(".review");
    return sumWithGaps(
      [
        REVIEW_HEADER_HEIGHT,
        reviewEl
          ? textHeight(reviewEl.textContent || "", CONTENT_FONT, 21, contentWidth)
          : null,
        card.querySelector(".products") ? REVIEW_PRODUCTS_HEIGHT : null,
        card.querySelector(".author-info") ? REVIEW_AUTHOR_HEIGHT : null,
      ],
      CARD_INNER_GAP,
      REVIEW_PADDING * 2,
    );
  }

  const contentWidth = colWidth - CARD_PADDING_INLINE * 2;
  const img = card.querySelector(".image-link img");
  const heading = card.querySelector("h3");
  const paragraphs = [...card.querySelectorAll("p:not(.price)")].filter((p) =>
    p.textContent?.trim(),
  );

  return sumWithGaps(
    [
      img ? colWidth / (img.width / img.height || 1.5) : null,
      heading
        ? textHeight(heading.textContent || "", HEADING_FONT, 22.4, contentWidth)
        : null,
      card.querySelector(".price") ? PRICE_HEIGHT : null,
      ...paragraphs.map((p) =>
        textHeight(p.textContent || "", CONTENT_FONT, 21, contentWidth),
      ),
      card.querySelector(".list-item-cart-controls, .button, .add-to-cart")
        ? BUTTON_HEIGHT
        : null,
    ],
    CARD_INNER_GAP,
    CARD_PADDING_INLINE,
  );
};

export const placeCards = (container) => {
  const cards = [...container.querySelectorAll(":scope > li")];
  if (cards.length === 0) return;

  const colCount =
    container.offsetWidth < MOBILE_BREAKPOINT
      ? 1
      : Math.max(2, Math.floor((container.offsetWidth + GAP) / (280 + GAP)));
  const colWidth = (container.offsetWidth - GAP * (colCount - 1)) / colCount;
  const colHeights = new Float64Array(colCount);

  for (const card of cards) {
    const cardHeight = measureCard(card, colWidth);
    const col = colHeights.indexOf(Math.min(...colHeights));
    card.style.width = `${colWidth}px`;
    card.style.transform = `translate(${col * (colWidth + GAP)}px, ${colHeights[col]}px)`;
    colHeights[col] += cardHeight + GAP;
  }

  const maxH = Math.max(...colHeights);
  container.style.height = `${maxH > 0 ? maxH - GAP : 0}px`;
  container.classList.add("masonry-ready");
};

onReady(() => {
  const containers = document.querySelectorAll(
    ".design-system ul.items.masonry",
  );
  if (containers.length === 0) return;

  const layoutAll = () => {
    for (const container of containers) {
      placeCards(container);
    }
  };

  layoutAll();

  const state = { timer: 0 };
  window.addEventListener("resize", () => {
    clearTimeout(state.timer);
    state.timer = setTimeout(layoutAll, 100);
  });
});
