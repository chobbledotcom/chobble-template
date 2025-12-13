import { onReady } from "./on-ready.js";

let gallery, currentImage;

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

const initGallery = () => {
  gallery = document.getElementById("gallery");
  currentImage = document.querySelector(".current-image");

  if (!gallery || !currentImage) return;

  gallery.removeEventListener("click", loadImage);
  gallery.addEventListener("click", loadImage);
};

onReady(initGallery);
