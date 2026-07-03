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
import { onReady } from "#public/utils/on-ready.js";

const SCOPE = "[data-popup-scope]";
const TRIGGER = "[data-popup-trigger]";
const THUMB_LINK = ".image-link[data-index]";
const HERO_LINK = ".current-image-link";

const NEIGHBOR_REVEAL_RATIO = 0.5;
const HERO_SCROLL_THRESHOLD = 50;

const getNeighborOffset = (li, sliderRect) => {
  if (li.nextElementSibling) {
    const nextRect = li.nextElementSibling.getBoundingClientRect();
    const visibleWidth = Math.max(0, sliderRect.right - nextRect.left);
    const targetWidth =
      li.nextElementSibling.offsetWidth * NEIGHBOR_REVEAL_RATIO;
    if (visibleWidth < targetWidth) {
      return targetWidth - visibleWidth;
    }
  }

  if (li.previousElementSibling) {
    const prevRect = li.previousElementSibling.getBoundingClientRect();
    const visibleWidth = Math.max(0, prevRect.right - sliderRect.left);
    const targetWidth =
      li.previousElementSibling.offsetWidth * NEIGHBOR_REVEAL_RATIO;
    if (visibleWidth < targetWidth) {
      return -(targetWidth - visibleWidth);
    }
  }

  return 0;
};

const getScrollOffset = (li, slider) => {
  const liRect = li.getBoundingClientRect();
  const sliderRect = slider.getBoundingClientRect();

  const fullyVisible =
    liRect.left >= sliderRect.left && liRect.right <= sliderRect.right;

  if (!fullyVisible) {
    const items = slider.querySelectorAll(":scope > li");
    const isEdge = li === items[0] || li === items[items.length - 1];
    const extra = isEdge ? 0 : li.offsetWidth / 2;

    return liRect.left < sliderRect.left
      ? liRect.left - sliderRect.left - extra
      : liRect.right - sliderRect.right + extra;
  }

  return getNeighborOffset(li, sliderRect);
};

const scrollThumbnailIntoView = (imageLink) => {
  const li = imageLink.closest("li");
  const slider = li?.closest(".slider");
  if (!slider) return;

  const offset = getScrollOffset(li, slider);
  if (!offset) return;

  slider.scrollBy({ left: offset, behavior: "smooth" });
};

const getFullImageWrappers = (scope) => [
  ...scope.querySelectorAll(".gallery-full-size-images .image-wrapper"),
];

// data-index is 1-based in templates; the popup works with 0-based indexes.
export const resolveStartIndex = (trigger) => {
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
  openImagePopup({ wrappers, startIndex: resolveStartIndex(trigger), trigger });
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

const handleDocumentClick = (event) => {
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

onReady(initGallery);
