# Viral Son — 11ty (Eleventy) Modern Blogging Platform

A production-ready static site built with **Eleventy (11ty) v3**, ready for instant publishing on **GitHub** and **Netlify**.

---

## 🚀 Quick Start for Real-World Publishing (GitHub + Netlify)

### 1. Push to GitHub
```bash
git add .
git commit -m "Configure 11ty architecture and dynamic layouts"
git push origin main
```

### 2. Deploy to Netlify
1. Log into [Netlify](https://app.netlify.com/) and click **"Add new site"** → **"Import an existing project"**.
2. Connect your **GitHub** repository (`michael-edet/Viralson`).
3. Netlify will automatically detect `netlify.toml` with the preconfigured build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `_site`
   - **Node version:** `22`
4. Click **"Deploy site"** — your blog is live worldwide on Netlify's high-speed CDN!

---

## 📁 Architecture & File Layout

```
├── eleventy.config.js          # Eleventy 3 config (passthroughs, filters, shortcodes)
├── netlify.toml                # Netlify build rules, security headers & 301 redirects
├── package.json                # npm scripts (build, dev, lint)
├── server.js                   # Express server serving _site/ on port 3000
├── Assets/
│   ├── CD/CSS/index.css        # Unified master stylesheet (replaces duplicate inline styles)
│   └── pageloader/             # Reusable loader CSS & JavaScript
├── src/
│   ├── _data/
│   │   └── site.json           # Global site metadata, navigation items & branding
│   ├── _includes/
│   │   ├── header.njk          # Dynamic navigation with active category highlighting
│   │   ├── footer.njk          # Dynamic footer with category-tailored links & department emails
│   │   ├── pageloader.njk      # Global animated page loader
│   │   └── layouts/
│   │       ├── base.njk        # Main HTML5 shell (metadata, SEO, stylesheets, scripts)
│   │       ├── post.njk        # Article layout (breadcrumbs, author, tags, comments, sidebar)
│   │       └── page.njk        # Standard static page layout (headers, container)
│   ├── index.njk               # Homepage (Hero, Featured Cards, Breaking News, Audio Spotlights)
│   ├── news/index.njk          # News category hub (/news/)
│   ├── entertainment/index.njk # Entertainment category hub (/entertainment/)
│   ├── technology/index.njk    # Technology category hub (/technology/)
│   ├── lifestyle/index.njk     # Lifestyle category hub (/lifestyle/)
│   ├── community/index.njk     # Community hub with discussion boards (/community/)
│   ├── about/index.njk         # About Us page (/about/)
│   ├── download/
│   │   ├── music.njk           # Music download portal (/download/music/)
│   │   └── music0.njk          # Deluxe music download bundle (/download/music0/)
│   └── posts/
│       ├── global-climate-summit.njk
│       ├── revolutionary-foldable-phone.njk
│       ├── summer-music-festival.njk
│       ├── minimalism-lifestyle.njk
│       ├── future-of-ai.njk
│       ├── productive-habits.njk
│       ├── better-sleep-science.njk
│       ├── midnight-dreams-track.njk
│       ├── midnight-whispers.njk
│       └── simple-post.njk
└── _site/                      # Compiled production static output
```

---

## 🏷️ 11ty Tags & Front Matter Guide

### How to Add a New Post
Create a new file in `src/posts/my-new-post.njk` with this front matter:

```html
---
layout: layouts/post.njk
title: "Title of Your Post"
description: "Brief summary for SEO and social share cards."
excerpt: "Introductory lead paragraph shown on cards and under title."
category: "Technology"              # 'News', 'Technology', 'Entertainment', or 'Lifestyle'
categoryUrl: "/technology/"        # Canonical category link for breadcrumbs
categoryClass: "tech"              # 'tech', 'news', 'ent', or 'life'
author: "Your Name"
authorBio: "Short writer bio."
date: 2026-10-03
readTime: "5 min read"
views: "1.2K views"
image: "https://images.unsplash.com/..."
imageCaption: "Optional image credits"
tags: ["Gadgets", "AI", "Mobile"]
permalink: "/posts/my-new-post/"
---

Write your article content here in standard HTML or Markdown.
```

### Dynamic Header & Footer Behavior
- **Active Navigation:** When a reader is on `/news/` or on any article categorized as `"News"` (e.g. `/posts/global-climate-summit/`), the header's **News** link automatically gets the `active` CSS class.
- **Dynamic Footer Columns:**
  - News pages show **News Categories** and **news@viralson.com**.
  - Technology pages show **Tech Categories** and **tech@viralson.com**.
  - Entertainment & Download pages show **Entertainment links** and **entertainment@viralson.com**.
  - Lifestyle pages show **Lifestyle Topics** and **lifestyle@viralson.com**.
  - Community pages show **Community Hub** links and **community@viralson.com**.
- **Dynamic Breadcrumbs:** Automatically renders `Home > [Category] > [Article Title]` with active hyperlinks.

---

## 🛠️ Local Development & Build Commands

- **Build 11ty static site:** `npm run build`
- **Start local server (port 3000):** `npm run dev`
- **Validate templates without writing files:** `npm run lint`
