/**
 * Lazy YouTube video embed - loads iframe on user interaction.
 *
 * Progressive enhancement: Without JS, clicking opens YouTube in a new tab.
 * With JS, clicking replaces the thumbnail with an embedded iframe.
 */

/**
 * Initialize lazy video embeds.
 * Attaches click handlers to all video placeholders.
 */
const initVideoEmbeds = () => {
  for (const element of document.querySelectorAll(".video-placeholder")) {
    element.addEventListener("click", (event) => {
      const wrapper = event.currentTarget.closest(".video-wrapper");
      const videoId = wrapper?.dataset.videoId;

      if (!videoId) return;

      event.preventDefault();

      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
      iframe.title = "YouTube video player";
      iframe.frameBorder = "0";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;

      wrapper.appendChild(iframe);
      wrapper.classList.add("is-playing");
    });
  }
};

export { initVideoEmbeds };
