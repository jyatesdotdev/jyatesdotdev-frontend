# src/ — application source

This is the React Router `appDirectory` (configured in `../react-router.config.ts`).

## Map

- `root.tsx` — root layout: `<html>` shell, provider stack
  `ThemeProvider → SWRConfig`, global chrome (`Navbar`, `Outlet`,
  `Footer`, `Analytics`). `ErrorBoundary` here distinguishes 404 from crashes and reports
  crashes to `window.awsRum?.recordError`. SWR's global `onError` also reports to RUM.
- `routes.ts` — the route table (`index`, `route(...)`, catch-all `*`).
- `index.css` — Tailwind v4 entry: `@import "tailwindcss"`, `@theme` font tokens,
  `@custom-variant dark`, sugar-high `--sh-*` syntax-highlight colors. There is no
  tailwind.config file — Tailwind v4 is configured in CSS.
- `routes/` — thin re-export shims only (see `routes/AGENTS.md`).
- `components/` — all real UI + co-located tests (see `components/AGENTS.md`).
- `blog/` — MDX post registry and posts (see `blog/AGENTS.md`).
- `api/` — typed fetch helpers for the backend (`/api/v1/...`).
- `data/` — static site data (career, projects, library, etc.).
- `assets/` — static imports.
- `lib/` — plain-JS shared utilities importable by both Node scripts and the browser
  bundle. Currently `hash.js` (FNV-1a, hex; typed by `hash.d.ts`), used to derive
  prebuilt PlantUML diagram filenames (`/diagrams/<hash>.svg`) from the same hash in
  both `../scripts/generate-diagrams.js` and `components/plantuml.tsx` — keep it plain
  JS so Node can import it directly.

## Checklist: adding a new static page

1. Create the component in `components/<name>.tsx` (+ `<name>.test.tsx`).
2. Add a shim in `routes/<name>.tsx` re-exporting it as default.
3. Register the path in `routes.ts` — prerendering picks it up automatically
   (`../react-router.config.ts` derives its static-route list from `routes.ts`).
4. If it should appear in the sitemap, check `../scripts/generate-assets.js`.

Blog posts do NOT need this checklist — they are auto-discovered (see `blog/AGENTS.md`).
