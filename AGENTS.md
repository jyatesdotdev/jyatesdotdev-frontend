# jyatesdotdev-frontend

React SPA for jyates.dev. **This directory is the git repo root, but the app lives one
level down in `spa/`** — run all npm commands from `spa/`, not here. There is no root
package.json / workspace setup.

See `spa/AGENTS.md` for the app itself.

## What lives at this level

- `.github/workflows/deploy.yml` — deploys on push to `main` that touches `spa/**`
  (or manual dispatch): first runs the sibling integration repo's LocalStack E2E suite,
  then Node 22, `npm ci && npm run build` with `VITE_*` repo variables, OIDC
  assume-role, three-pass `aws s3 sync --delete` with tiered `Cache-Control`
  (hashed `assets/` immutable-1y → other static files 1d → HTML last, `no-cache`),
  CloudFront invalidation `/*`, deployed-revision verification, and a trusted content
  notification manifest under `notification-events/<sha>.json` when a push publishes a
  post or adds a project. Static syncs must keep excluding `notification-events/`.
- `.github/workflows/security.yml` — on push/PR to `main`: `npm audit --audit-level=high`,
  CodeQL (js/ts), `npm test` (Vitest), and a lint+typecheck job.
- `spa/.deploy-trigger` — empty tracked file; committing a trivial change to it is the
  mechanism to force a redeploy without other code changes (deploy only fires on `spa/**`).
- `JOURNEY.md` — narrative project history and design rationale. It is context, not a
  replacement for the current contracts in code and nested `AGENTS.md` files.

## Gotchas

- Run `npm run lint`, `npm run typecheck`, and `npm test` (from `spa/`) before
  considering a change done — CI enforces all three on push/PR to `main`.
- Cross-repo E2E for the deployed stack lives in the sibling
  `jyatesdotdev-integration` repo. `spa/e2e/` holds local functional Playwright specs
  for core browser workflows plus the macOS-bound visual-regression suite.
