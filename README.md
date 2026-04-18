# jyatesdotdev-frontend

React SPA for [jyates.dev](https://jyates.dev) — prerendered static site served from S3 via CloudFront.

## Architecture

- **Framework**: React 18 / React Router 7 (SPA mode, `ssr: false`)
- **Build**: Vite with prerendering — generates static HTML for all routes at build time
- **Styling**: Tailwind CSS v4
- **Data Fetching**: SWR for API interactions (likes, comments)
- **Content**: Blog posts are MDX files bundled at build time. Projects, career, and library are static data files.
- **Observability**: CloudWatch RUM (10% sampling in production)

### Key Design Decisions

- **SPA mode** (`ssr: false`): React Router's server-side rendering requires a `/__manifest` endpoint that doesn't exist on static S3 hosting. SPA mode with prerendering gives the best of both worlds — fast initial loads from prerendered HTML, client-side navigation after hydration.
- **CloudFront Function**: Rewrites directory-like paths (e.g., `/projects`) to `/projects/index.html` so prerendered routes resolve in S3. Excludes `/api/*` paths.
- **Custom Error Response**: CloudFront returns `index.html` for 404s (SPA fallback). Only 404 is caught — not 403 — so API error responses pass through correctly.

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
npx playwright test   # E2E tests
```

## Deployment

Pushes to `main` (under `spa/**`) or manual `workflow_dispatch` trigger the pipeline:

1. Build the SPA with Vite (prerendering all routes)
2. Sync `build/client/` to the S3 static site bucket
3. Invalidate the CloudFront cache (`/*`)

The frontend deploy does **not** trigger the infra repo — it only needs S3 sync and cache invalidation.

### Manual Trigger

```bash
gh workflow run deploy.yml --repo jyatesdotdev/jyatesdotdev-frontend --ref main
```

### Required Secrets & Variables

| Type | Name | Description |
|---|---|---|
| Secret | `AWS_ROLE_ARN` | GitHub OIDC deploy role ARN |
| Secret | `FRONTEND_BUCKET` | S3 bucket name for static site |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |
| Variable | `VITE_RECAPTCHA_SITE_KEY` | Google reCAPTCHA v3 site key |
| Variable | `VITE_RUM_APPLICATION_ID` | CloudWatch RUM app monitor ID |
| Variable | `VITE_RUM_IDENTITY_POOL_ID` | Cognito Identity Pool ID for RUM |
| Variable | `AWS_REGION` | `us-west-2` |

## Environment Variables

| Variable | Context | Description |
|---|---|---|
| `VITE_RUM_APPLICATION_ID` | Prod | RUM application ID |
| `VITE_RUM_IDENTITY_POOL_ID` | Prod | Cognito Identity Pool — enables real RUM SDK |
| `VITE_RECAPTCHA_SITE_KEY` | Prod | reCAPTCHA v3 site key |
| `VITE_PROXY_TARGET` | Dev | API Gateway URL for local proxying |
