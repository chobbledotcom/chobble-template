import { onReady } from "./on-ready.js";

const SVG_PREV = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <polyline points="15 18 9 12 15 6"></polyline>
</svg>`;

const SVG_NEXT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <polyline points="9 18 15 12 9 6"></polyline>
</svg>`;

let gallery, currentImage, imagePopup;
let currentPopupIndex = 1;
let totalImages = 0;

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

  currentImage.innerHTML = fullImage.outerHTML;
  currentPopupIndex = index;

  const rect = currentImage.getBoundingClientRect();
  if (Math.abs(rect.top) > 50) {
    currentImage.scrollIntoView({ behavior: "smooth" });
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

  currentPopupIndex = index;

  const image = imagePopup.querySelector(".image-wrapper");
  image.outerHTML = content;
  image.querySelectorAll("[sizes]").forEach((el) => (el.sizes = "100vw"));

  const prev = imagePopup.querySelector(".popup-nav-prev");
  const next = imagePopup.querySelector(".popup-nav-next");
  if (prev) prev.style.visibility = index <= 1 ? "hidden" : "visible";
  if (next) next.style.visibility = index >= totalImages ? "hidden" : "visible";
};

const navigatePopup = (direction) => {
  const newIndex = currentPopupIndex + direction;
  if (newIndex >= 1 && newIndex <= totalImages) {
    updatePopupImage(newIndex);
  }
};

const openPopup = () => {
  const image = currentImage.querySelector(".image-wrapper");

  const prevHidden = currentPopupIndex <= 1 ? 'style="visibility: hidden"' : "";
  const nextHidden =
    currentPopupIndex >= totalImages ? 'style="visibility: hidden"' : "";

  imagePopup.innerHTML = `
    ${
      totalImages > 1
        ? `<button type="button" class="popup-nav popup-nav-prev" ${prevHidden} aria-label="Previous image">
      ${SVG_PREV}
    </button>`
        : ""
    }
    ${image.outerHTML}
    ${
      totalImages > 1
        ? `<button type="button" class="popup-nav popup-nav-next" ${nextHidden} aria-label="Next image">
      ${SVG_NEXT}
    </button>`
        : ""
    }
  `;

  imagePopup.querySelectorAll("[sizes]").forEach((el) => (el.sizes = "100vw"));
  imagePopup.showModal();
};

const handlePopupClick = (event) => {
  // Handle navigation button clicks
  if (event.target.closest(".popup-nav-prev")) {
    event.stopPropagation();
    navigatePopup(-1);
    return;
  }
  if (event.target.closest(".popup-nav-next")) {
    event.stopPropagation();
    navigatePopup(1);
    return;
  }

  // Close popup when clicking elsewhere (image or backdrop)
  imagePopup.close();
};

const handleKeydown = (event) => {
  if (!imagePopup.open || totalImages <= 1) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    navigatePopup(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    navigatePopup(1);
  }
};

const initGallery = () => {
  gallery = document.getElementById("gallery");
  currentImage = document.querySelector(".current-image");
  imagePopup = document.getElementById("image-popup");

  // Count total images
  const fullImages = document.querySelectorAll('[class^="full-image-"]');
  totalImages = fullImages.length;

  // Thumbnail gallery switching (only if multiple images)
  if (gallery && currentImage) {
    gallery.removeEventListener("click", loadImage);
    gallery.addEventListener("click", loadImage);
  }

  // Image popup (works even with single image)
  if (currentImage && imagePopup) {
    currentImage.removeEventListener("click", openPopup);
    currentImage.addEventListener("click", openPopup);

    imagePopup.removeEventListener("click", handlePopupClick);
    imagePopup.addEventListener("click", handlePopupClick);

    document.removeEventListener("keydown", handleKeydown);
    document.addEventListener("keydown", handleKeydown);
  }
};

onReady(initGallery);
