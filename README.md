# jyatesdotdev-frontend

This repository contains the Single Page Application (SPA) frontend for `jyates.dev`. It is a React-based web application focused on speed, brutalist premium aesthetics, and responsive layout.

## Architecture

* **Framework**: React 18 / React Router 7
* **Tooling**: Vite (for lightning-fast HMR and optimized builds)
* **Styling**: Tailwind CSS v4 with modern flex/grid layouts and CSS tokens
* **Data Fetching**: SWR (Stale-While-Revalidate) for optimistic UI and caching
* **Content**: MDX for blog posts and documentation
* **Observability**: AWS CloudWatch RUM (Real User Monitoring) configured for 10% sampling

## Local Development

While you can run the frontend in isolation, it expects an API to communicate with. For full-stack development, we use the integration shell scripts.

1. Navigate to the Integration repository: `cd ../jyatesdotdev-integration`
2. Boot the stack: `./start-dev.sh`

This orchestrates a LocalStack simulated-AWS backend locally, formats `.env.local`, and then spins up the Vite compilation server automatically.

To run purely the frontend in isolation (with no backend available):
```bash
cd spa
npm i
npm run dev
```

## Testing

### Unit / Component Tests (Vitest)
Fast isolated tests for all React components using `@testing-library/react`.

```bash
cd spa
npm test
```

### Frontend-Only E2E Tests (Playwright)
Navigation and visual regression tests that don't require a backend:

```bash
cd spa
npx playwright test e2e/home.spec.ts
npx playwright test e2e/visual.spec.ts
```

### Full Integration E2E Tests
Tests that require a real backend live in the sibling [`jyatesdotdev-integration`](https://github.com/jyatesdotdev/jyatesdotdev-integration) repo.

## Observability

The `Analytics` component provides a decoupled telemetry pipeline:

- **Production**: Initializes the `aws-rum-web` SDK when `VITE_RUM_IDENTITY_POOL_ID` is set.
- **Development**: Falls back to a mock dispatcher that logs events to the dev server console at `/rum-telemetry`.

### Tracked Events
- **Page views** — Every SPA route change
- **Performance** — TTFB, DOMContentLoaded, Load Event
- **Errors** — Global JS exceptions, API failures, rendering crashes
- **Custom interactions** — Blog post likes (`like_toggled`)

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_RUM_APPLICATION_ID` | Yes (dev) | RUM application ID (use `00000000-...` locally) |
| `VITE_RUM_IDENTITY_POOL_ID` | Prod only | Cognito pool — triggers real SDK |
| `VITE_RECAPTCHA_SITE_KEY` | Prod only | Google ReCAPTCHA v3 site key |
| `VITE_PROXY_TARGET` | Dev only | API Gateway URL for local backend proxying |

## Deployment Pipeline

Deployments are handled by GitHub Actions. 
1. Pushes to `main` are swept by `CodeQL` (Security Scans) and `npm audit` for vulnerabilities, as well as checking `Vitest` regressions.
2. The code is compiled by Vite and synced up to a static S3 Hosting Bucket via the `Frontend Deployment` workflow.
3. The workflow fires a Webhook cross-repository to `jyatesdotdev-infra`, instructing Terraform to invalidate the CloudFront CDN caches.

### Required Secrets
To enable the deployment pipeline, provide the following GitHub Action secrets:
* `AWS_ACCESS_KEY_ID`
* `AWS_SECRET_ACCESS_KEY`
* `FRONTEND_BUCKET` (The name of the target static S3 bucket)
* `INFRA_REPO_PAT` (A GitHub Personal Access Token to trigger `jyatesdotdev-infra`)
