(() => {
  let gallery, currentImage;

  const loadImage = (event) => {
    const imageLink = event.target.closest(".image-link");
    if (!imageLink) return;

    event.preventDefault();

    const index = imageLink.getAttribute("data-index");
    const fullImage = document.querySelector(`.full-image-${index}`);

    if (!fullImage) return;

    currentImage.innerHTML = fullImage.innerHTML;
    currentImage.scrollIntoView({ behavior: "smooth" });
  };

  const initGallery = () => {
    gallery = document.getElementById("gallery");
    currentImage = document.querySelector(".current-image");

    if (!gallery || !currentImage) return;

    gallery.removeEventListener("click", loadImage);
    gallery.addEventListener("click", loadImage);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGallery);
  } else {
    initGallery();
  }

  document.addEventListener("turbo:load", initGallery);
})();
