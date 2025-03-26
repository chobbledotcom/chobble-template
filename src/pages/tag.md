---
pagination:
  data: collections
  size: 1
  alias: tag
  filter:
    - all
permalink: /tags/{{ tag }}/
layout: tag.html
navigationParent: Tags
eleventyComputed:
  title: 'Tagged "{{ tag | replace: ''-'', '' '' }}"'
  header_text: 'Tagged "{{ tag | replace: ''-'', '' '' }}"'
  meta_title: 'Tagged "{{ tag | replace: ''-'', '' '' }}"'
---

## Tagged "{{ tag }}"
