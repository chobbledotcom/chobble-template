---
title: Eleventy
short_description: The Chobble Template is built with the Eleventy static site generator
header_image: src/images/placeholder-wide-3.jpg
categories:
  - open-source
faqs:
  - question: Is Eleventy free to use?
    answer: Yes, Eleventy is open source and completely free.
    order: 1
  - question: Do I need to know JavaScript?
    answer: Basic knowledge helps, but you can build sites with just Markdown.
    order: 2
features:
  - Open source static site generator
  - Markdown-based content files
  - Fast build times
  - Active development and regular updates
  - Supports multiple input formats (Markdown, HTML, JSON, APIs)
  - Extensive plugin ecosystem
  - JavaScript-based for easy extensibility
  - Live reload during development
  - Low resource hosting requirements
---

Eleventy is a static site generator. This means it takes a folder of text files as its inputs, along with some technical details about the site's structure, and it outputs a complete website. There are loads of static site generators and I (Chobble) have used a few of them, but I like Eleventy the most, because it's very flexible and it supports all sorts of languages and plugins, and it's written in JavaScript which is easy to get stuck into. It's also "fast", which means it builds quickly, but really the big benefit I've found is that it's just really easy to build with.

## What is Static Site Generation?

The input files are generally Markdown files, but really they could be anything and there'd be some way to figure out a way to read them into Eleventy. Markdown is a really easy to edit text file that lets you do some technical things that are essential on websites, like links, bold, lists, italics, quotes, etc. You can't format styles and colours directly, but that's a good thing, because those should be configured in a site-wide style anyway.

The output is a "rendered" website. Basically, that's a folder containing HTML files, which you then upload to your web host, and then they serve those files to the user as they click around your site. Static sites are great because they require very low resources to host and there's very little room for anything to randomly break, unlike dynamic websites powered by a database, which requires an operating system (usually), which is just a lot more moving parts.

## Why Eleventy?

I used to use Jekyll and quite liked it, but its development was really slow and it was stuck with old versions of some important components which meant working with it became painful. Eleventy is actively developed and always coming up with neat little additions.

## Flexibility & Language Support

While the Chobble Template uses Markdown for its input files, these could be HTML files, or the system could read from an API (an interface another website provides), or JSON files. I chose Markdown because they're the easiest for a non-technical person to understand and they work great with PagesCMS, and they're the hardest to cause strange bugs with.

Plugin-wise, you can do all sorts: create sitemaps, render images at different sizes for mobiles vs desktop, or you can write your own interfaces to add functionality to Eleventy, like my tweak that adds low-resolution placeholder backgrounds to images so there's something to render immediately. It's all easy because of how flexible Eleventy is.

## JavaScript Foundation

JavaScript isn't my favourite programming language (Ruby is), but lots of people know how to write it and it's easy to work with. And because there's a big ecosystem of JavaScript programs, it's easy to integrate them into your platform directly without needing to bridge to any other programming languages.

## Developer Experience

I like to have the site open on one half of my screen, and a terminal window on the other. As I make changes to the code in the terminal, the site refreshes to show my updates live! This is a feature that's built into Eleventy, and it makes it really fast to develop new features or change styles because you can see your work straight away.
