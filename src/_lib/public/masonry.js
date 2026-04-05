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

// Review card constants
const AVATAR_SIZE = 40;

const CONTENT_FONT =
  '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const HEADING_FONT =
  '600 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const NAME_FONT =
  '600 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const textHeight = (text, font, lineHeight, width) =>
  layout(prepare(text, font), width, lineHeight).height;

const sumWithGaps = (heights, gap, extraPadding) => {
  const valid = heights.filter((h) => h !== null);
  const gaps = valid.length > 1 ? gap * (valid.length - 1) : 0;
  return (
    CARD_BORDER + valid.reduce((sum, h) => sum + h, 0) + gaps + extraPadding
  );
};

const lineHeightOf = (el) =>
  Number.parseFloat(getComputedStyle(el).lineHeight) || 0;

const measureReviewAuthor = (card, authorWidth, halfGap) => {
  const nameEl = card.querySelector(".name");
  const nameHeight = nameEl
    ? textHeight(nameEl.textContent || "", NAME_FONT, 21, authorWidth)
    : null;
  if (nameHeight === null) return null;
  const linkEl = card.querySelector(".review-link");
  const linkHeight = linkEl
    ? textHeight(linkEl.textContent || "", CONTENT_FONT, 21, authorWidth)
    : null;
  const details = nameHeight + (linkHeight !== null ? halfGap + linkHeight : 0);
  return Math.max(AVATAR_SIZE, details);
};

const measureReviewCard = (card, colWidth) => {
  const styles = getComputedStyle(card);
  const gap = Number.parseFloat(styles.getPropertyValue("--item-gap")) || 16;
  const padY =
    Number.parseFloat(styles.paddingTop) +
    Number.parseFloat(styles.paddingBottom);
  const contentWidth =
    colWidth -
    Number.parseFloat(styles.paddingLeft) -
    Number.parseFloat(styles.paddingRight);
  const authorWidth = contentWidth - AVATAR_SIZE - gap;

  const elHeight = (sel, font, w) => {
    const el = card.querySelector(sel);
    return el ? textHeight(el.textContent || "", font, 21, w) : null;
  };

  return sumWithGaps(
    [
      lineHeightOf(
        card.querySelector(".rating") || card.querySelector(".date"),
      ),
      elHeight(".review", CONTENT_FONT, contentWidth),
      elHeight(".products", CONTENT_FONT, contentWidth),
      measureReviewAuthor(card, authorWidth, gap / 2),
    ],
    gap,
    padY,
  );
};

const measureItemCard = (card, colWidth) => {
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
        ? textHeight(
            heading.textContent || "",
            HEADING_FONT,
            22.4,
            contentWidth,
          )
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

export const measureCard = (card, colWidth) =>
  card.querySelector(".review-header")
    ? measureReviewCard(card, colWidth)
    : measureItemCard(card, colWidth);

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
