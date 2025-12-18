---
title: Guide
subtitle: Browse our knowledge base
layout: guide-index.html
permalink: /guide/
eleventyNavigation:
  key: Guide
  order: 50
---

<h1>{{ title }}</h1>

Welcome to our knowledge base. Browse the categories below to find helpful articles and answers to common questions.

{% if collections.guide_categories.size > 0 %}
<h2>Categories</h2>
<ul>
  {%- for category in collections.guide_categories -%}
  <li>
    {%- if category.data.icon -%}
    {{ category.data.icon | inline_asset }}
    {%- endif -%}
    <a href="{{ category.url }}">{{ category.data.title }}</a>
    {%- if category.data.subtitle -%}
    <p>{{ category.data.subtitle }}</p>
    {%- endif -%}
  </li>
  {%- endfor -%}
</ul>
{% endif %}
