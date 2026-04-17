# jyatesdotdev-frontend

This repository contains the Single Page Application (SPA) frontend for `jyates.dev`. It is a React-based web application focused on speed, brutalist premium aesthetics, and responsive layout.

## Architecture

* **Framework**: React 18 
* **Tooling**: Vite (for lightning-fast HMR and optimized builds)
* **Styling**: Vanilla CSS with modern flex/grid layouts and CSS tokens
* **Data Fetching**: SWR (Stale-While-Revalidate) for optimistic UI and caching
* **Routing**: React Router
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

For React-specific component testing:
```bash
cd spa
npm test
```

For browser visual regression tests and full backend-dependent workflow tests, look in the `jyatesdotdev-integration` E2E test suite.

## Deployment pipeline

Deployments are handled by GitHub Actions. 
1. Pushes to `main` are swept by `CodeQL` and `npm audit` for supply-chain vulnerabilities, as well as checking `Vitest` regressions.
2. The code is compiled by Vite and synced up to a static S3 Hosting Bucket via the `Deploy` workflow.
3. The workflow fires a Webhook cross-repository to `jyatesdotdev-infra`, instructing Terraform to invalidate the CloudFront CDN caches.

### Required Secrets
To enable the deployment pipeline, provide the following GitHub Action secrets:
* `AWS_ACCESS_KEY_ID`
* `AWS_SECRET_ACCESS_KEY`
* `FRONTEND_BUCKET` (The name of the target static S3 bucket)
* `INFRA_REPO_PAT` (A GitHub Personal Access Token to trigger `jyatesdotdev-infra`)
