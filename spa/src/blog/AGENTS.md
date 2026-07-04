# blog/ — MDX posts

- `posts.ts` — registry via `import.meta.glob('./posts/*.mdx', { eager: true })`.
  Slug = filename minus `.mdx`. `getPosts()` sorts by `publishedAt` desc and excludes
  drafts; `getPostBySlug()` serves the post route (drafts resolve only in dev).
- `posts/*.mdx` — one file per post. New posts are auto-discovered: auto-registered,
  auto-prerendered (`react-router.config.ts` reads this directory), and auto-added to
  sitemap/RSS by the postbuild script. No manual registration anywhere.
- `post.tsx` — post page: renders MDX through the `MDXComponents` map, injects JSON-LD
  `BlogPosting`, and mounts `<Likes>` / `<Comments>`.

## Adding a post

Prefer `npm run new-post` (from `spa/`) — it prompts for title/summary/tags and writes a
correctly-formatted file. If hand-writing, copy an existing post's frontmatter exactly.

## Frontmatter format (strict YAML — indentation matters)

```yaml
---
title: My Post Title
publishedAt: 2026-07-04
summary: >-
  A multi-line summary value MUST be indented (2 spaces) under its key.
tags:
  - one
  - two
---
```

Optional: `draft: true` marks a post as a draft — it is excluded from `getPosts()`
(home/blog listings), prerendering, sitemap.xml, and rss.xml, and `getPostBySlug()`
only serves it in dev (`npm run dev`) for local preview. Remove the flag to publish.

The frontmatter is exported as `metadata` via `remark-mdx-frontmatter`. **A multi-line
value at column 0 is invalid YAML and breaks the build** — this has happened before.
Available MDX components (headings, `PlantUML`, code blocks) are defined in
`../components/mdx.tsx`.
