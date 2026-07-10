# spa/ — the jyates.dev app

React 19.2 + React Router 8 in **framework mode with `ssr: false`** (pure SPA, prerendered
to static HTML). Vite 8, TypeScript 6, Tailwind CSS v4, MDX blog posts, Vitest 4 for unit
tests, Playwright for e2e (functional specs + visual-regression snapshots). ESM only (`"type": "module"`).

## Commands (run from this directory)

| Task | Command |
|---|---|
| Dev server | `npm run dev` (react-router dev, port 5173) |
| Build | `npm run build` (runs `scripts/generate-diagrams.js` first → PlantUML SVGs; postbuild runs `scripts/generate-assets.js` → sitemap/robots/rss) |
| Unit tests | `npm test` (Vitest) |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` (runs `react-router typegen` first — needed for route types) |
| E2e | `npm run e2e` (Playwright, port 4173 — functional + visual specs) |
| New blog post | `npm run new-post` (interactive scaffolder) |
| Detect publish events | `node scripts/collect-notifications.js <before-sha> <current-sha> <site-url>` |

Before finishing any change: `npm run lint && npm run typecheck && npm test`
(CI enforces all three on push/PR to `main`).

## Config gotchas

- `react-router.config.ts`: `appDirectory: "src"` (NOT the default `app/`), `ssr: false`,
  and `prerender()` derives static routes from `src/routes.ts` (index route + every path
  without `:`/`*` segments) plus auto-discovered blog routes from `src/blog/posts/*.mdx`
  (posts with `draft: true` frontmatter are skipped). Registering a page in `routes.ts`
  is enough to get it prerendered; blog posts are picked up automatically.
- `vite.config.ts` swaps plugins under test: `process.env.VITEST ? react() : reactRouter()`.
  Vitest runs without the router plugin — don't rely on router-plugin behavior in unit tests.
- Dev proxy: `/api` → `VITE_PROXY_TARGET` (default `http://localhost:8080`). The full local
  backend comes from `../../jyatesdotdev-integration/start-dev.sh`, which exports this var
  pointing at LocalStack API Gateway.
- A custom `mockRumTelemetryPlugin` dev middleware serves `/rum-telemetry` locally so RUM
  beacons have somewhere to land.
- **No path aliases** — all imports are relative (`../components/...`). `vite-tsconfig-paths`
  is installed but no `paths` are defined; don't introduce aliased imports.
- Env vars: `VITE_RUM_APPLICATION_ID` / `VITE_RUM_IDENTITY_POOL_ID` (presence enables the
  real `aws-rum-web` SDK), `VITE_RUM_ENDPOINT` / `VITE_RUM_REGION` (local mock),
  `VITE_PROXY_TARGET`. `.env.development` holds local values; prod values come from CI.
- `public/` is copied verbatim into `build/client/`: favicons, the `icons.svg` sprite,
  `images/` (profile photos, blog images, OG cards under `images/og/`), `logos/`.
  Everything is referenced by absolute path (`/images/...`) and served with a 1-day
  `Cache-Control` by the deploy workflow (updates rely on the `/*` invalidation).

## Testing gotchas

- Unit tests are co-located (`foo.tsx` + `foo.test.tsx`), Testing Library, components
  wrapped in `MemoryRouter`.
- `e2e/` holds both functional specs (`home.spec.ts`, `tools.spec.ts` — assertion-based,
  platform-independent) and the visual-regression suite (`visual.spec.ts`).
- `e2e/visual.spec.ts-snapshots/` baselines are **`-chromium-darwin` (macOS-only)**.
  Running Playwright on Linux regenerates different snapshot names/pixels and fails —
  these are local-macOS baselines; CI does not run this suite. The functional specs
  aren't snapshot-bound, so they're safe to run anywhere.
- `.deploy-trigger` is an empty file used to force CI redeploys — don't delete it.
- `scripts/collect-notifications.js` uses `gray-matter` for MDX frontmatter and the
  TypeScript AST for project data. It announces added public posts, draft-to-public
  posts, and newly added projects only. Project `id` values are stable publish
  identities and must not change on a rename; keep the manifest contract aligned with
  the API repo's `internal/notifications` validator.

See `src/AGENTS.md` for source-tree conventions.
