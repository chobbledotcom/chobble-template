import { onReady } from "#public/utils/on-ready.js";

const normalise = (str) =>
  str
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const initSearch = () => {
  const form = document.querySelector(".search-box");
  if (!form) return;

  const input = form.querySelector("input[name='q']");
  const keywordsDatalist = form.querySelector("datalist");
  const errorEl = form.querySelector(".search-error");

  if (!input || !keywordsDatalist || !errorEl) return;

  const validKeywords = Array.from(keywordsDatalist.options).map((opt) =>
    normalise(opt.value),
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const keyword = normalise(input.value);

    if (keyword && validKeywords.includes(keyword)) {
      errorEl.style.display = "none";
      window.location.href = `/search/${encodeURIComponent(keyword.replace(/ /g, "-"))}/`;
    } else {
      errorEl.style.display = "block";
      input.focus();
    }
  };

  form.addEventListener("submit", handleSubmit);
};

onReady(initSearch);
