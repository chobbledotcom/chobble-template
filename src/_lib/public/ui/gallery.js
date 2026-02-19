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

const loadImage = (event) => {
  const imageLink = event.target.closest(".image-link");
  if (!imageLink) return;

  event.preventDefault();

  const index = imageLink.getAttribute("data-index");
  showImageByIndex(Number.parseInt(index, 10));
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

const addNavigationButtons = (totalImages) => {
  if (totalImages <= 1) return;
  appendNavButton(IDS.GALLERY_NAV_PREV, state.currentPopupIndex <= 1);
};

const addNextButton = (totalImages) => {
  if (totalImages <= 1) return;
  appendNavButton(IDS.GALLERY_NAV_NEXT, state.currentPopupIndex >= totalImages);
};

const openPopup = () => {
  const image = state.currentImage.querySelector(".image-wrapper");
  const totalImages = getTotalImages();

  state.imagePopup.innerHTML = "";
  addNavigationButtons(totalImages);
  state.imagePopup.appendChild(image.cloneNode(true));
  addNextButton(totalImages);

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
