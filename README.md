# jyatesdotdev-frontend

React SPA for [jyates.dev](https://jyates.dev) — prerendered static site served from S3 via CloudFront.

## Architecture

- **Framework**: React 19 / React Router 8 (SPA mode, `ssr: false`)
- **Build**: Vite with prerendering — generates static HTML for all routes at build time
- **Styling**: Tailwind CSS v4
- **Data Fetching**: SWR for API interactions (likes, comments, visits, moderation)
- **Content**: Blog posts are MDX files bundled at build time. Projects, career, and library are static data files.
- **Observability**: CloudWatch RUM (100% sampling in production, protected by $10/month budget guard)

### Key Design Decisions

- **SPA mode** (`ssr: false`): React Router's server-side rendering requires a `/__manifest` endpoint that doesn't exist on static S3 hosting. SPA mode with prerendering gives the best of both worlds — fast initial loads from prerendered HTML, client-side navigation after hydration.
- **CloudFront Function**: Rewrites directory-like paths (e.g., `/projects`) to `/projects/index.html` so prerendered routes resolve in S3. Excludes `/api/*` paths.
- **Custom Error Response**: CloudFront returns `index.html` for 404s (SPA fallback). Only 404 is caught — not 403 — so API error responses pass through correctly.

## Product Surface

- **Content**: prerendered home, blog, career, projects, library, and contact pages,
  with MDX posts, build-time PlantUML diagrams, comments, likes, and RSS.
- **Subscriptions**: visitors can subscribe independently to new blog posts and
  projects, then confirm through an emailed link.
- **Interactive tools**: the navbar tools menu launches a browser-only `jsh` terminal
  and a visitor map. Every launch creates an independent draggable window; windows
  cascade, can be shaded or maximized, and move to the foreground when selected.
  Escape closes only the foreground window. The terminal includes persistent command
  history and files, tab completion, live site-status commands, an on-call lab, and a
  mobile keyboard control.
- **Future sections**: games, lab, and research have navbar menus backed by the same
  floating-window system. Their current entry is an animated, pixel-art under-
  construction scene; the games menu can replace that placeholder with a playable
  experience when the first game is ready.

## Repository Docs

- `AGENTS.md` and nested `AGENTS.md` files document operational constraints and local
  conventions for coding agents and maintainers.
- `JOURNEY.md` records how the frontend evolved and why its major architectural and
  interaction decisions were made.

## Local Development

```bash
cd spa
npm install
npm run dev
```

The frontend expects the API at `/api/v1/*`. For local development with a backend, configure `VITE_PROXY_TARGET`.

## Testing

```bash
cd spa
npm test              # Vitest unit/component tests
npm run lint          # ESLint
npm run typecheck     # react-router typegen + tsc
npm run e2e           # Playwright functional + visual tests (visual baselines are macOS-specific)
```

Full-stack E2E (frontend + Go API + LocalStack) lives in the sibling `jyatesdotdev-integration` repo — run `npm run e2e` there instead.

## Deployment

Pushes to `main` (under `spa/**`) or manual `workflow_dispatch` trigger the pipeline:

1. Run the cross-repo LocalStack E2E suite against the exact frontend revision
2. Build the SPA with Vite (prerendering all routes)
3. Sync `build/client/` to the S3 static site bucket and invalidate CloudFront (`/*`)
4. Verify the deployed revision, then queue notifications for newly published posts or
   newly added projects by writing a manifest under `notification-events/`

The frontend deploy does **not** trigger the infra repo. The manifest is uploaded only
after deployment verification succeeds, and manual workflow runs never announce content.

To force a redeploy with no code changes, commit a trivial change to `spa/.deploy-trigger` (the workflow only fires on pushes touching `spa/**`).

### Manual Trigger

```bash
gh workflow run deploy.yml --repo <owner>/jyatesdotdev-frontend --ref main
```

### Required Secrets & Variables

| Type | Name | Description |
|---|---|---|
| Secret | `AWS_ROLE_ARN` | GitHub OIDC deploy role ARN |
| Secret | `FRONTEND_BUCKET` | S3 bucket name for static site |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |
| Variable | `VITE_RUM_APPLICATION_ID` | CloudWatch RUM app monitor ID |
| Variable | `VITE_RUM_IDENTITY_POOL_ID` | Cognito Identity Pool ID for RUM |
| Variable | `AWS_REGION` | `us-west-2` |

## Environment Variables

| Variable | Context | Description |
|---|---|---|
| `VITE_RUM_APPLICATION_ID` | Prod | RUM application ID |
| `VITE_RUM_IDENTITY_POOL_ID` | Prod | Cognito Identity Pool — enables real RUM SDK |
| `VITE_PROXY_TARGET` | Dev | API Gateway URL for local proxying |
