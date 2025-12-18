import { onReady } from "./on-ready.js";

let gallery, currentImage, imagePopup;

const loadImage = (event) => {
  const imageLink = event.target.closest(".image-link");
  if (!imageLink) return;

  event.preventDefault();

  const index = imageLink.getAttribute("data-index");
  const fullImage = document.querySelector(`.full-image-${index}`);

  if (!fullImage) return;

  currentImage.innerHTML = fullImage.innerHTML;

  const rect = currentImage.getBoundingClientRect();
  if (Math.abs(rect.top) > 50) {
    currentImage.scrollIntoView({ behavior: "smooth" });
  }
};

const openPopup = () => {
  const imageWrapper = currentImage.querySelector(".image-wrapper");
  imagePopup.innerHTML = imageWrapper.outerHTML;
  imagePopup.querySelectorAll("[sizes]").forEach((el) => (el.sizes = "100vw"));
  imagePopup.showModal();
};

const closePopup = () => {
  imagePopup.close();
};

const initGallery = () => {
  gallery = document.getElementById("gallery");
  currentImage = document.querySelector(".current-image");
  imagePopup = document.getElementById("image-popup");

  // Thumbnail gallery switching (only if multiple images)
  if (gallery && currentImage) {
    gallery.removeEventListener("click", loadImage);
    gallery.addEventListener("click", loadImage);
  }

  // Image popup (works even with single image)
  if (currentImage && imagePopup) {
    currentImage.removeEventListener("click", openPopup);
    currentImage.addEventListener("click", openPopup);

    imagePopup.removeEventListener("click", closePopup);
    imagePopup.addEventListener("click", closePopup);
  }
};

onReady(initGallery);
