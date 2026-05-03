---
title: Search
layout: design-system-base.html
permalink: /search/
header_text: Search
blocks:
  - type: section-header
    intro: |-
      ## Search
  - type: include
    file: search-box.html
  - type: html
    content: |
      <div data-pagefind-ignore>
        <div id="search-results">
          <p class="search-message"></p>
          <ul class="search-results-list"></ul>
          <button class="search-load-more btn btn--secondary" hidden>Load more</button>
        </div>
      </div>
---
