// Masonry layout using uWrap for zero-reflow height prediction.
// Font metrics are read from computed styles so JS always matches CSS.
import { varPreLine } from "uwrap";
import { onReady } from "#public/utils/on-ready.js";

const GAP = 32;
const MOBILE_BREAKPOINT = 768;
const CARD_BORDER = 2;
const AVATAR_SIZE = 40;

const counterCache = new Map();

const getCounter = (font) => {
  if (counterCache.has(font)) return counterCache.get(font);
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = font;
  const counter = varPreLine(ctx).count;
  counterCache.set(font, counter);
  return counter;
};

const getFont = (el) => {
  const s = getComputedStyle(el);
  return `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
};

const getLineHeight = (el) =>
  Number.parseFloat(getComputedStyle(el).lineHeight);

export const textHeight = (text, font, lineHeight, width) =>
  getCounter(font)(text, width) * lineHeight;

const elTextHeight = (el, width) => {
  const text = el.textContent || "";
  return textHeight(text, getFont(el), getLineHeight(el), width);
};

const getCardMetrics = (card, colWidth) => {
  const s = getComputedStyle(card);
  const padLeft = Number.parseFloat(s.paddingLeft);
  const padRight = Number.parseFloat(s.paddingRight);
  const padTop = Number.parseFloat(s.paddingTop);
  const padBottom = Number.parseFloat(s.paddingBottom);
  const gap = Number.parseFloat(s.getPropertyValue("--item-gap")) || 16;
  return {
    gap,
    padX: padLeft + padRight,
    padY: padTop + padBottom,
    contentWidth: colWidth - padLeft - padRight,
  };
};

const sumWithGaps = (heights, gap, extraPadding) => {
  const valid = heights.filter((h) => h !== null);
  const gaps = valid.length > 1 ? gap * (valid.length - 1) : 0;
  return (
    CARD_BORDER + valid.reduce((sum, h) => sum + h, 0) + gaps + extraPadding
  );
};

const measureReviewCard = (card, colWidth) => {
  const { gap, padY, contentWidth } = getCardMetrics(card, colWidth);
  const halfGap = gap / 2;
  const authorWidth = contentWidth - AVATAR_SIZE - gap;

  const measureEl = (sel, w) => {
    const el = card.querySelector(sel);
    return el ? elTextHeight(el, w) : null;
  };

  const dateHeight = measureEl(".date", contentWidth) || 0;
  const ratingEl = card.querySelector(".rating");
  const ratingHeight = ratingEl
    ? textHeight("xxxxx", getFont(ratingEl), getLineHeight(ratingEl), contentWidth)
    : 0;
  const ratingSectionHeight = Math.max(dateHeight, ratingHeight) || null;
  const reviewHeight = measureEl(".review", contentWidth);
  const productsHeight = measureEl(".products", contentWidth);
  const nameHeight = measureEl(".name", authorWidth);
  const linkHeight = measureEl(".review-link", authorWidth);

  // Author section: name + optional link (half-gap), min avatar height
  const authorDetails =
    nameHeight !== null
      ? nameHeight + (linkHeight !== null ? halfGap + linkHeight : 0)
      : null;
  const authorHeight =
    authorDetails !== null ? Math.max(AVATAR_SIZE, authorDetails) : null;

  return sumWithGaps(
    [ratingSectionHeight, reviewHeight, productsHeight, authorHeight],
    gap,
    padY,
  );
};

const measureItemCard = (card, colWidth) => {
  const { gap, padX, contentWidth } = getCardMetrics(card, colWidth);
  const img = card.querySelector(".image-link img");
  const heading = card.querySelector("h3");
  const paragraphs = [...card.querySelectorAll("p:not(.price)")].filter((p) =>
    p.textContent?.trim(),
  );
  const priceEl = card.querySelector(".price");
  const buttonEl = card.querySelector(
    ".list-item-cart-controls, .button, .add-to-cart",
  );

  return sumWithGaps(
    [
      img ? colWidth / (img.width / img.height || 1.5) : null,
      heading ? elTextHeight(heading, contentWidth) : null,
      priceEl ? elTextHeight(priceEl, contentWidth) : null,
      ...paragraphs.map((p) => elTextHeight(p, contentWidth)),
      buttonEl ? Number.parseFloat(getComputedStyle(buttonEl).height) : null,
    ],
    gap,
    padX,
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
