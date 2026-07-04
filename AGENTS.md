# jyatesdotdev-frontend

React SPA for jyates.dev. **This directory is the git repo root, but the app lives one
level down in `spa/`** — run all npm commands from `spa/`, not here. There is no root
package.json / workspace setup.

See `spa/AGENTS.md` for the app itself.

## What lives at this level

- `.github/workflows/deploy.yml` — deploys on push to `main` that touches `spa/**`
  (or manual dispatch): Node 22, `npm ci && npm run build` with `VITE_*` repo variables,
  OIDC assume-role, `aws s3 sync build/client/ --delete`, CloudFront invalidation `/*`,
  then dispatches a `run_e2e` event to the `jyatesdotdev-integration` repo.
- `.github/workflows/security.yml` — on push/PR to `main`: `npm audit --audit-level=high`,
  CodeQL (js/ts), `npm test` (Vitest), and a lint+typecheck job.
- `spa/.deploy-trigger` — empty tracked file; committing a trivial change to it is the
  mechanism to force a redeploy without other code changes (deploy only fires on `spa/**`).

## Gotchas

- Run `npm run lint`, `npm run typecheck`, and `npm test` (from `spa/`) before
  considering a change done — CI enforces all three on push/PR to `main`.
- E2E for the deployed stack lives in the sibling `jyatesdotdev-integration` repo, not
  here. `spa/e2e/` only holds a local visual-regression Playwright suite.
