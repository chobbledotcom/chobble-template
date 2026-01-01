import { onReady } from "#assets/on-ready.js";
import { cls, GALLERY_NAV_CLASSES, TEMPLATE_IDS } from "#assets/selectors.js";
import { getTemplate } from "#assets/template.js";

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
  showImageByIndex(parseInt(index, 10));
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

const updatePopupImage = (index) => {
  const content = getPopupContent(index);
  if (!content) return;

  state.currentPopupIndex = index;

  const image = state.imagePopup.querySelector(".image-wrapper");
  image.outerHTML = content;
  for (const el of state.imagePopup.querySelectorAll("[sizes]")) {
    el.sizes = "100vw";
  }

  const prev = state.imagePopup.querySelector(cls(GALLERY_NAV_CLASSES.PREV));
  const next = state.imagePopup.querySelector(cls(GALLERY_NAV_CLASSES.NEXT));
  if (prev) prev.style.visibility = index <= 1 ? "hidden" : "visible";
  if (next)
    next.style.visibility = index >= getTotalImages() ? "hidden" : "visible";
};

const navigatePopup = (direction) => {
  const newIndex = state.currentPopupIndex + direction;
  if (newIndex >= 1 && newIndex <= getTotalImages()) {
    updatePopupImage(newIndex);
  }
};

const openPopup = () => {
  const image = state.currentImage.querySelector(".image-wrapper");
  const totalImages = getTotalImages();

  // Clear popup and build content using templates
  state.imagePopup.innerHTML = "";

  if (totalImages > 1) {
    const prevBtn = getTemplate(TEMPLATE_IDS.GALLERY_NAV_PREV);
    if (state.currentPopupIndex <= 1) {
      prevBtn.querySelector(cls(GALLERY_NAV_CLASSES.PREV)).style.visibility =
        "hidden";
    }
    state.imagePopup.appendChild(prevBtn);
  }

  state.imagePopup.appendChild(image.cloneNode(true));

  if (totalImages > 1) {
    const nextBtn = getTemplate(TEMPLATE_IDS.GALLERY_NAV_NEXT);
    if (state.currentPopupIndex >= totalImages) {
      nextBtn.querySelector(cls(GALLERY_NAV_CLASSES.NEXT)).style.visibility =
        "hidden";
    }
    state.imagePopup.appendChild(nextBtn);
  }

  for (const el of state.imagePopup.querySelectorAll("[sizes]")) {
    el.sizes = "100vw";
  }
  state.imagePopup.showModal();
};

const handlePopupClick = (event) => {
  // Handle navigation button clicks
  if (event.target.closest(cls(GALLERY_NAV_CLASSES.PREV))) {
    event.stopPropagation();
    navigatePopup(-1);
    return;
  }
  if (event.target.closest(cls(GALLERY_NAV_CLASSES.NEXT))) {
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
