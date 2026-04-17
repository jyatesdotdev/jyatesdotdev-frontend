# jyatesdotdev-frontend

React SPA for [jyates.dev](https://jyates.dev), built with React Router, Vite, Tailwind CSS v4, and MDX.

## Quick Start

```bash
cd spa
npm install
npm run dev
```

## Testing

### Unit / Component Tests (Vitest)
Fast isolated tests for all React components using `@testing-library/react`.

```bash
npm run test
```

### Frontend-Only E2E Tests (Playwright)
Navigation and visual regression tests that don't require a backend:

```bash
npx playwright test e2e/home.spec.ts
npx playwright test e2e/visual.spec.ts
```

### Full Integration E2E Tests
Tests that require a real backend (post interactions, admin dashboard, telemetry) live in the sibling [`jyatesdotdev-integration`](https://github.com/jyates/jyatesdotdev-integration) repo. See its README for setup instructions.

## Observability

The `Analytics` component provides a decoupled telemetry pipeline:

- **Production**: Initializes the `aws-rum-web` SDK when `VITE_RUM_IDENTITY_POOL_ID` is set.
- **Development**: Falls back to a mock dispatcher that logs events to the dev server console at `/rum-telemetry`.

### Tracked Events
- **Page views** — Every SPA route change
- **Performance** — TTFB, DOMContentLoaded, Load Event
- **Errors** — Global JS exceptions, unhandled rejections, API failures, rendering crashes
- **Custom interactions** — Blog post likes (`like_toggled`)

### Error Reporting
All `catch` blocks across the codebase report to `window.awsRum.recordError()`:
- Contact form, comment submission, comment likes
- Admin update/delete operations
- SWR data-fetching failures (via global `SWRConfig.onError`)
- React Router `ErrorBoundary` crashes

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_RUM_APPLICATION_ID` | Yes (dev) | RUM application ID (use `00000000-...` locally) |
| `VITE_RUM_ENDPOINT` | No | Telemetry endpoint (defaults to `/rum-telemetry`) |
| `VITE_RUM_REGION` | No | AWS region (defaults to `us-east-1`) |
| `VITE_RUM_IDENTITY_POOL_ID` | Prod only | Cognito pool — triggers real SDK |
| `VITE_RUM_GUEST_ROLE_ARN` | Prod only | IAM role for anonymous users |
| `VITE_RECAPTCHA_SITE_KEY` | Prod only | Google ReCAPTCHA v3 site key |
| `VITE_PROXY_TARGET` | Dev only | API Gateway URL for local backend proxying |

## Project Structure

```
spa/
├── src/
│   ├── blog/posts/        ← MDX blog content
│   ├── components/        ← React components + co-located tests
│   ├── api/               ← API client
│   └── root.tsx           ← App shell with SWRConfig + Analytics
├── e2e/                   ← Frontend-only Playwright tests
│   ├── home.spec.ts
│   └── visual.spec.ts
├── vite.config.ts         ← Includes mock RUM telemetry plugin
└── playwright.config.ts
```
