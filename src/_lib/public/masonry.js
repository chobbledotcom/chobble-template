// Masonry layout using uWrap for zero-reflow height prediction.
// Font metrics are read from computed styles so JS always matches CSS.
import { varPreLine } from "uwrap";
import { onReady } from "#public/utils/on-ready.js";
import { memoize } from "#utils/fp/memoize.js";

const GAP = 32;
const MOBILE_BREAKPOINT = 768;
const CARD_BORDER = 2;
const ITEM_PADDING_INLINE = 24;

const BUTTON_SELECTOR = ".button";

// Cached per font string across layout calls.
const getCounter = memoize((font) => {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = font;
  return varPreLine(ctx).count;
});

export const textHeight = (text, font, lineHeight, width) =>
  getCounter(font)(text, width) * lineHeight;

const sumWithGaps = (heights, gap, extraPadding) => {
  const valid = heights.filter((h) => h !== null);
  const gaps = valid.length > 1 ? gap * (valid.length - 1) : 0;
  const total =
    CARD_BORDER + valid.reduce((sum, h) => sum + h, 0) + gaps + extraPadding;

  return total;
};

const debounce = (fn, delay) => {
  let timer = null;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
};

onReady(() => {
  const getFont = (el) => {
    const s = getComputedStyle(el);
    return `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  };

  const getLineHeight = (el) =>
    Number.parseFloat(getComputedStyle(el).lineHeight);

  const elTextHeight = (el, width) => {
    const text = (el.textContent || "").trim().replace("\n", " ");
    const h = textHeight(text, getFont(el), getLineHeight(el), width);
    el.dataset.height = h;
    return h;
  };

  const createMetrics = (colWidth, gap) => ({
    gap,
    padX: ITEM_PADDING_INLINE * 2,
    padY: ITEM_PADDING_INLINE * 2,
    contentWidth: colWidth - ITEM_PADDING_INLINE * 2,
  });

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

  const isContentChild = (buttonEl) => (el) =>
    !el.classList.contains("image-link") && el !== buttonEl;

  const buttonHeightOf = (buttonEl) =>
    buttonEl ? Number.parseFloat(getComputedStyle(buttonEl).height) : null;

  const extraPaddingFor = (imgHeight, hasContent, metrics) => {
    if (!imgHeight) return metrics.padY;
    return hasContent ? metrics.padY / 2 + metrics.gap : 0;
  };

  const measureItemCard = (card, metrics, colWidth) => {
    const imgHeight = measureImageHeight(card, colWidth);
    const buttonEl = card.querySelector(BUTTON_SELECTOR);

    const childHeights = [...card.children]
      .filter(isContentChild(buttonEl))
      .map((el) => elTextHeight(el, metrics.contentWidth));
    card.dataset.heights = JSON.stringify(childHeights);

    const buttonHeight = buttonHeightOf(buttonEl);
    const hasContent = childHeights.length > 0 || buttonHeight !== null;
    const extraPadding = extraPaddingFor(imgHeight, hasContent, metrics);

    return (
      (imgHeight ? imgHeight - CARD_BORDER : 0) +
      sumWithGaps([...childHeights, buttonHeight], metrics.gap, extraPadding)
    );
  };

  const ensureValidHeight = (maxH, cardCount, container) => {
    if (!maxH || maxH <= GAP) {
      throw new Error(
        `Masonry container has ${cardCount} cards but computed height is ${maxH}. ` +
          "This usually means getComputedStyle returned NaN values (e.g. unresolved CSS custom properties or missing font metrics). " +
          `Container: ${container.className}`,
      );
    }
  };

  const placeCards = (container) => {
    const cards = [...container.querySelectorAll(":scope > li")];
    if (cards.length === 0) return;

    const colCount =
      container.offsetWidth < MOBILE_BREAKPOINT
        ? 1
        : Math.max(2, Math.floor((container.offsetWidth + GAP) / (280 + GAP)));
    const colWidth = (container.offsetWidth - GAP * (colCount - 1)) / colCount;
    const metrics = createMetrics(colWidth - CARD_BORDER, GAP);
    const colHeights = new Float64Array(colCount);

    for (const card of cards) {
      const cardHeight = measureItemCard(card, metrics, colWidth);
      const col = colHeights.indexOf(Math.min(...colHeights));
      card.dataset.height = cardHeight.toFixed(1);
      card.dataset.metrics = JSON.stringify(metrics);
      card.style.width = `${colWidth}px`;
      card.style.transform = `translate(${col * (colWidth + GAP)}px, ${colHeights[col]}px)`;
      colHeights[col] += cardHeight + GAP;
    }

    const maxH = Math.max(...colHeights);
    ensureValidHeight(maxH, cards.length, container);
    container.style.height = `${maxH - GAP}px`;
    container.classList.add("masonry-ready");
  };

  const containers = document.querySelectorAll(
    ".design-system ul.items.masonry",
  );
  if (containers.length === 0) return;

  const layoutAll = () => {
    for (const container of containers) placeCards(container);
  };

  layoutAll();
  window.addEventListener("resize", debounce(layoutAll, 100));
});
