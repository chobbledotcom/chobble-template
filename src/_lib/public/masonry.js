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
  const text = (el.textContent || "").trim().replace("\n", " ");
  const h = textHeight(text, getFont(el), getLineHeight(el), width);
  el.dataset.height = h;
  return h;
};

const getReviewMetrics = (card, colWidth) => {
  const s = getComputedStyle(card);
  const padLeft = Number.parseFloat(s.paddingLeft);
  const padRight = Number.parseFloat(s.paddingRight);
  const padTop = Number.parseFloat(s.paddingTop);
  const padBottom = Number.parseFloat(s.paddingBottom);
  const gap = Number.parseFloat(s.getPropertyValue("--item-gap"));
  return {
    gap,
    padX: padLeft + padRight,
    padY: padTop + padBottom,
    contentWidth: colWidth - padLeft - padRight,
  };
};

const getCardMetrics = (card, colWidth) => {
  const s = getComputedStyle(card);
  const gap = Number.parseFloat(s.getPropertyValue("--item-gap"));
  const padding = Number.parseFloat(
    s.getPropertyValue("--item-padding-inline"),
  );
  return {
    gap,
    padX: padding * 2,
    padY: padding * 2,
    contentWidth: colWidth - padding * 2,
  };
};

const sumWithGaps = (heights, gap, extraPadding) => {
  const valid = heights.filter((h) => h !== null);
  const gaps = valid.length > 1 ? gap * (valid.length - 1) : 0;
  const total =
    CARD_BORDER + valid.reduce((sum, h) => sum + h, 0) + gaps + extraPadding;

  return total;
};

const measureReviewCard = (card, metrics) => {
  const halfGap = metrics.gap / 2;
  const authorWidth = metrics.contentWidth - AVATAR_SIZE - metrics.gap;

  const measureEl = (sel, w) => {
    const el = card.querySelector(sel);
    if (!el) return null;
    const h = elTextHeight(el, w);
    el.dataset.height = h.toFixed(1);
    return h;
  };

  const dateHeight = measureEl(".date", metrics.contentWidth) || 0;
  const ratingEl = card.querySelector(".rating");
  const ratingHeight = ratingEl
    ? textHeight(
        "xxxxx",
        getFont(ratingEl),
        getLineHeight(ratingEl),
        metrics.contentWidth,
      )
    : 0;

  const ratingSectionHeight = Math.max(dateHeight, ratingHeight) || null;

  const reviewHeight = measureEl(".review p", metrics.contentWidth);
  const productsHeight = measureEl(".products", metrics.contentWidth);
  const nameHeight = measureEl(".name", authorWidth);
  const reviewLinkHeight = measureEl(".review-link", authorWidth);

  const authorDetails =
    nameHeight !== null
      ? nameHeight +
        (reviewLinkHeight !== null ? halfGap + reviewLinkHeight : 0)
      : null;

  const authorHeight =
    authorDetails !== null ? Math.max(AVATAR_SIZE, authorDetails) : null;

  return sumWithGaps(
    [ratingSectionHeight, reviewHeight, productsHeight, authorHeight],
    metrics.gap,
    metrics.padY,
  );
};
const parseAspectRatio = (el) => {
  const match = (el.getAttribute("style") || "").match(
    /aspect-ratio:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/,
  );
  if (!match) return null;
  const h = Number.parseFloat(match[2]);
  return h > 0 ? Number.parseFloat(match[1]) / h : null;
};

const measureImageHeight = (card, colWidth) => {
  const imageWrapper = card.querySelector(".image-wrapper");
  if (!imageWrapper) return null;
  const ratio = parseAspectRatio(imageWrapper);
  const h = ratio ? colWidth / ratio : null;
  imageWrapper.dataset.height = h;
  return h;
};

const measureItemCard = (card, metrics, colWidth) => {
  const imgHeight = measureImageHeight(card, colWidth);

  const buttonEl = card.querySelector(
    ".list-item-cart-controls, .button, .add-to-cart",
  );

  const childHeights = [];
  for (const el of card.children) {
    if (!el.classList.contains("image-link") && el !== buttonEl)
      childHeights.push(elTextHeight(el, metrics.contentWidth));
  }
  card.dataset.heights = JSON.stringify(childHeights);

  return (
    (imgHeight ? imgHeight - CARD_BORDER : 0) +
    sumWithGaps(
      [
        ...childHeights,
        buttonEl ? Number.parseFloat(getComputedStyle(buttonEl).height) : null,
      ],
      metrics.gap,
      imgHeight ? metrics.padY / 2 + metrics.gap : metrics.padY,
    )
  );
};

export const placeCards = (container) => {
  const cards = [...container.querySelectorAll(":scope > li")];
  if (cards.length === 0) return;

  const isReviews = container.classList.contains("reviews-grid");
  const colCount =
    container.offsetWidth < MOBILE_BREAKPOINT
      ? 1
      : Math.max(2, Math.floor((container.offsetWidth + GAP) / (280 + GAP)));
  const colWidth = (container.offsetWidth - GAP * (colCount - 1)) / colCount;
  const innerWidth = colWidth - CARD_BORDER;
  const metrics = isReviews
    ? getReviewMetrics(cards[0], innerWidth)
    : getCardMetrics(cards[0], innerWidth);
  const colHeights = new Float64Array(colCount);

  for (const card of cards) {
    const cardHeight = isReviews
      ? measureReviewCard(card, metrics)
      : measureItemCard(card, metrics, colWidth);
    const col = colHeights.indexOf(Math.min(...colHeights));
    card.dataset.height = cardHeight.toFixed(1);
    card.dataset.metrics = JSON.stringify(metrics);
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
