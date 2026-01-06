import { onReady } from "#assets/utils/on-ready.js";

const normalise = (str) =>
  str
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const initSearch = () => {
  const form = document.getElementById("search-form");
  if (!form) return;

  const keywordsDatalist = document.getElementById("keywords");
  if (!keywordsDatalist) return;

  const validKeywords = Array.from(keywordsDatalist.options).map((opt) =>
    normalise(opt.value),
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById("keyword");
    const keyword = normalise(input.value);
    const errorEl = document.getElementById("search-error");

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
