import { onReady } from "#public/utils/on-ready.js";

const initSearch = () => {
  const el = document.querySelector("#pagefind-search");
  if (!el) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/pagefind/pagefind-ui.css";
  document.head.appendChild(link);

  const script = document.createElement("script");
  script.src = "/pagefind/pagefind-ui.js";
  script.onload = () => {
    new window.PagefindUI({
      element: "#pagefind-search",
      showSubResults: true,
      showImages: true,
      resetStyles: false,
    });
  };
  document.head.appendChild(script);
};

onReady(initSearch);
