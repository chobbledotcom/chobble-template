import { getTemplate, IDS, onReady } from "#public/utils/ui-deps.js";

const NAV_PREV = '[data-nav="prev"]';
const NAV_NEXT = '[data-nav="next"]';

const state = {
  gallery: null,
  currentImage: null,
  imagePopup: null,
  currentPopupIndex: 1,
};

const getTotalImages = () =>
  document.querySelectorAll('[class^="full-image-"]').length;

const NEIGHBOR_REVEAL_RATIO = 0.5;

const getNeighborOffset = (li, sliderRect) => {
  const nextLi = li.nextElementSibling;
  if (nextLi) {
    const nextRect = nextLi.getBoundingClientRect();
    const visibleWidth = Math.max(0, sliderRect.right - nextRect.left);
    const targetWidth = nextLi.offsetWidth * NEIGHBOR_REVEAL_RATIO;
    if (visibleWidth < targetWidth) {
      return targetWidth - visibleWidth;
    }
  }

  const prevLi = li.previousElementSibling;
  if (prevLi) {
    const prevRect = prevLi.getBoundingClientRect();
    const visibleWidth = Math.max(0, prevRect.right - sliderRect.left);
    const targetWidth = prevLi.offsetWidth * NEIGHBOR_REVEAL_RATIO;
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

  // Temporarily disable scroll-snap so the browser doesn't override
  // our precise positioning (e.g. snapping back to a snap point)
  slider.style.scrollSnapType = "none";
  slider.scrollBy({ left: offset, behavior: "smooth" });
  slider.addEventListener(
    "scrollend",
    () => {
      slider.style.scrollSnapType = "";
    },
    { once: true },
  );
};

const loadImage = (event) => {
  const imageLink = event.target.closest(".image-link");
  if (!imageLink) return;

  event.preventDefault();

  const index = imageLink.getAttribute("data-index");
  showImageByIndex(Number.parseInt(index, 10));
  scrollThumbnailIntoView(imageLink);
};

const showImageByIndex = (index) => {
  const fullImage = document.querySelector(`.full-image-${index}`);
  if (!fullImage) return;

  state.currentImage.innerHTML = fullImage.outerHTML;
  state.currentPopupIndex = index;

  const rect = state.currentImage.getBoundingClientRect();
  if (Math.abs(rect.top) > 50) {
    state.currentImage.scrollIntoView({ behavior: "smooth" });
  }
};

const getPopupContent = (index) => {
  const imageWrapper = document.querySelector(
    `.full-image-${index} .image-wrapper`,
  );
  if (!imageWrapper) return "";
  return imageWrapper.outerHTML;
};

const setNavVisibility = (selector, isHidden) => {
  const el = state.imagePopup.querySelector(selector);
  if (el) el.style.visibility = isHidden ? "hidden" : "visible";
};

const updatePopupImage = (index) => {
  const content = getPopupContent(index);
  if (!content) return;

  state.currentPopupIndex = index;
  state.imagePopup.querySelector(".image-wrapper").outerHTML = content;
  for (const el of state.imagePopup.querySelectorAll("[sizes]"))
    el.sizes = "100vw";
  setNavVisibility(NAV_PREV, index <= 1);
  setNavVisibility(NAV_NEXT, index >= getTotalImages());
};

const navigatePopup = (direction) => {
  const newIndex = state.currentPopupIndex + direction;
  if (newIndex >= 1 && newIndex <= getTotalImages()) {
    updatePopupImage(newIndex);
  }
};

const appendNavButton = (templateId, shouldHide) => {
  const btn = getTemplate(templateId, document);
  if (shouldHide) btn.firstElementChild.style.visibility = "hidden";
  state.imagePopup.appendChild(btn);
};

const openPopup = () => {
  const image = state.currentImage.querySelector(".image-wrapper");
  const totalImages = getTotalImages();
  const hasNav = totalImages > 1;

  state.imagePopup.innerHTML = "";
  if (hasNav)
    appendNavButton(IDS.GALLERY_NAV_PREV, state.currentPopupIndex <= 1);
  state.imagePopup.appendChild(image.cloneNode(true));
  if (hasNav)
    appendNavButton(
      IDS.GALLERY_NAV_NEXT,
      state.currentPopupIndex >= totalImages,
    );

  for (const el of state.imagePopup.querySelectorAll("[sizes]")) {
    el.sizes = "100vw";
  }
  state.imagePopup.showModal();
};

const handlePopupClick = (event) => {
  // Handle navigation button clicks
  if (event.target.closest(NAV_PREV)) {
    event.stopPropagation();
    navigatePopup(-1);
    return;
  }
  if (event.target.closest(NAV_NEXT)) {
    event.stopPropagation();
    navigatePopup(1);
    return;
  }

  // Close popup when clicking elsewhere (image or backdrop)
  state.imagePopup.close();
};

const handleKeydown = (event) => {
  if (!state.imagePopup.open || getTotalImages() <= 1) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    navigatePopup(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    navigatePopup(1);
  }
};

const initGallery = () => {
  state.gallery = document.getElementById("gallery");
  state.currentImage = document.querySelector(".current-image");
  state.imagePopup = document.getElementById("image-popup");

  // Thumbnail gallery switching (only if multiple images)
  if (state.gallery && state.currentImage) {
    state.gallery.removeEventListener("click", loadImage);
    state.gallery.addEventListener("click", loadImage);
  }

  // Image popup (works even with single image)
  if (state.currentImage && state.imagePopup) {
    state.currentImage.removeEventListener("click", openPopup);
    state.currentImage.addEventListener("click", openPopup);

    state.imagePopup.removeEventListener("click", handlePopupClick);
    state.imagePopup.addEventListener("click", handlePopupClick);

    document.removeEventListener("keydown", handleKeydown);
    document.addEventListener("keydown", handleKeydown);
  }
};

onReady(initGallery);
