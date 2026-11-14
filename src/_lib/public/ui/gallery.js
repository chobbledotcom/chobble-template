// In-page gallery behaviour.
//
// Galleries are marked with [data-popup-scope] and contain a hidden
// .gallery-full-size-images block (one .full-image-{n} per image, 1-indexed).
// Two kinds of clicks are handled, both delegated from document so any
// number of galleries can coexist on a page:
//
//   - [data-popup-trigger] elements (the hero image link, gallery-block
//     images) open the fullscreen popup with every full-size image in
//     their scope, starting from the trigger's data-index.
//   - .image-link[data-index] thumbnails swap their scope's hero image
//     in place (product/property galleries).
//
// All links keep real hrefs, so without JavaScript they fall back to
// linking the image file directly.
import { openImagePopup } from "#public/ui/image-popup.js";

const SCOPE = "[data-popup-scope]";
const TRIGGER = "[data-popup-trigger]";
const THUMB_LINK = ".image-link[data-index]";
const HERO_LINK = ".current-image-link";

const NEIGHBOR_REVEAL_RATIO = 0.5;
const HERO_SCROLL_THRESHOLD = 50;

/**
 * How much of a neighbour to reveal around a slider edge, or 0 when it is
 * already visible enough. measure() maps the sibling's rect to the visible
 * width on its side of the slider.
 * @param {Element | null} sibling
 * @param {(rect: DOMRect) => number} measure
 * @returns {number}
 */
const revealGap = (sibling, measure) => {
  if (!sibling) return 0;
  const siblingRect = sibling.getBoundingClientRect();
  const visibleWidth = Math.max(0, measure(siblingRect));
  const targetWidth = sibling.offsetWidth * NEIGHBOR_REVEAL_RATIO;
  return visibleWidth < targetWidth ? targetWidth - visibleWidth : 0;
};

const handleDocumentClick = (event) => {
  const getFullImageWrappers = (scope) => [
    ...scope.querySelectorAll(".gallery-full-size-images .image-wrapper"),
  ];

  // data-index is 1-based in templates; the popup works with 0-based indexes.
  const resolveStartIndex = (trigger) => {
    const index = Number.parseInt(trigger.dataset.index, 10);
    if (Number.isNaN(index)) {
      throw new Error("[data-popup-trigger] requires a numeric data-index");
    }
    return index - 1;
  };

  const openFromTrigger = (event, trigger) => {
    const scope = trigger.closest(SCOPE);
    if (!scope) return;

    const wrappers = getFullImageWrappers(scope);
    if (wrappers.length === 0) return;

    event.preventDefault();
    openImagePopup({
      wrappers,
      startIndex: resolveStartIndex(trigger),
      trigger,
    });
  };

  const getNeighborOffset = (li, sliderRect) => {
    const rightGap = li.nextElementSibling
      ? revealGap(li.nextElementSibling, (rect) => sliderRect.right - rect.left)
      : 0;
    const leftGap = li.previousElementSibling
      ? revealGap(
          li.previousElementSibling,
          (rect) => rect.right - sliderRect.left,
        )
      : 0;
    return rightGap - leftGap;
  };

  const edgeScrollOffset = (li, slider, liRect, sliderRect) => {
    const items = slider.querySelectorAll(":scope > li");
    const isEdge = li === items[0] || li === items[items.length - 1];
    const extra = isEdge ? 0 : li.offsetWidth / 2;

    return liRect.left < sliderRect.left
      ? liRect.left - sliderRect.left - extra
      : liRect.right - sliderRect.right + extra;
  };

  const getScrollOffset = (li, slider) => {
    const liRect = li.getBoundingClientRect();
    const sliderRect = slider.getBoundingClientRect();

    const fullyVisible =
      liRect.left >= sliderRect.left && liRect.right <= sliderRect.right;

    return fullyVisible
      ? getNeighborOffset(li, sliderRect)
      : edgeScrollOffset(li, slider, liRect, sliderRect);
  };

  const scrollThumbnailIntoView = (imageLink) => {
    const li = imageLink.closest("li");
    const slider = li?.closest(".slider");
    if (!slider) return;

    const offset = getScrollOffset(li, slider);
    if (!offset) return;

    slider.scrollBy({ left: offset, behavior: "smooth" });
  };

  const scrollHeroIntoView = (heroLink) => {
    const rect = heroLink.getBoundingClientRect();
    if (Math.abs(rect.top) > HERO_SCROLL_THRESHOLD) {
      heroLink.scrollIntoView({ behavior: "smooth" });
    }
  };

  const swapCurrentImage = (event, thumbLink, scope) => {
    const heroLink = scope.querySelector(HERO_LINK);
    if (!heroLink) return;

    const index = Number.parseInt(thumbLink.dataset.index, 10);
    const wrapper = scope.querySelector(`.full-image-${index} .image-wrapper`);
    if (!wrapper) return;

    event.preventDefault();
    heroLink.replaceChildren(wrapper.cloneNode(true));
    heroLink.dataset.index = String(index);
    heroLink.href = thumbLink.href;

    scrollHeroIntoView(heroLink);
    scrollThumbnailIntoView(thumbLink);
  };

  const trigger = event.target.closest(TRIGGER);
  if (trigger) {
    openFromTrigger(event, trigger);
    return;
  }

  const thumbLink = event.target.closest(THUMB_LINK);
  const scope = thumbLink?.closest(SCOPE);
  if (scope) swapCurrentImage(event, thumbLink, scope);
};

export const initGallery = () => {
  document.removeEventListener("click", handleDocumentClick);
  document.addEventListener("click", handleDocumentClick);
};
