---
pagination:
  data: collections
  size: 1
  alias: tag
  filter:
    - all
    - page
    - news
    - categories
    - products
permalink: /tags/{{ tag }}/
layout: tag.html
eleventyComputed:
  title: 'Pages Tagged "{{ tag | replace: ''-'', '' '' }}"'
  header_text: 'Pages Tagged "{{ tag | replace: ''-'', '' '' }}"'
  meta_title: 'Pages Tagged "{{ tag | replace: ''-'', '' '' }}"'
---
