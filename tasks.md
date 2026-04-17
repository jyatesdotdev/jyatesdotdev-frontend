# Tasks for Migration to AWS

## Phase 1: Environment Setup & Infrastructure
## Phase 1: Environment Setup & Infrastructure
- [x] **Infrastructure as Code (Terraform)**:
  - [x] **Migrate Infrastructure**: Moved from `jyatesdotdev-api/infra` to a dedicated `jyatesdotdev-infra` repository.
  - [x] **Set up CI/CD**: Created GitHub Actions for automated deployment.

- [x] **Security Scanning**:
  - [x] Set up `tfsec` or `checkov` for IaC scanning.
  - [x] Configure `npm audit` and SAST (CodeQL) for application code.
  - [x] Configure `github/workflows/security.yml` to run scans on PR.
  - [x] Run local scanning with `tfsec`.
- [x] **Testing**:
  - [x] Validate Terraform configuration with `terraform validate`.
  - [x] Investigate to see if there is a testing framework for Terraform (Identified Terratest as the primary choice).


## Phase 2: Local Development Environment
- [x] **Docker Orchestration**:
  - [x] Create `docker-compose.yml` for local dependencies.
  - [x] Configure `amazon/dynamodb-local`.
  - [x] Configure `localstack` or SAM CLI for Lambda/API Gateway emulation.
  - [x] Create `localstack-init/01_init.sh` for resource initialization.
- [x] **Shared Utilities**:
  - [x] Implement DynamoDB client with local/remote toggle.
  - [x] Implement ReCAPTCHA v3 verification service.
  - [x] Implement SES email service.

## Phase 3: Backend Development (Lambda)
- [x] **Interaction Service**:
  - [x] Implement `GET/POST /api/v1/likes` (post likes) with ReCAPTCHA (consistent protection).
  - [x] Implement `GET/POST /api/v1/comments` with ReCAPTCHA and `bluemonday`.
  - [x] Implement `POST /api/v1/comments/:id/like` with ReCAPTCHA (consistent protection).
  - [x] Implement atomic increments/decrements for `likeCount` in DynamoDB.
  - [x] Implement optimized `userHasLiked` check for comments using `POST#<slug>#USER#<ipAddress>` query.
  - [x] **Admin Notification**: Implement logic to send an SES email to the admin when a new comment is submitted.
- [x] **Contact Service**:
  - [x] Implement `POST /api/v1/contact` with ReCAPTCHA and SES.
- [x] **Admin Service**:
  - [x] Implement Lambda Authorizer for Basic Auth.
  - [x] Implement `GET/PUT/DELETE /api/v1/admin/comments` for moderation.
- [x] **Testing**:
  - [x] Write Go tests for all handlers (90% coverage target).
  - [x] Write integration tests against `dynamodb-local`.

## Phase 4: Frontend Development (SPA)
- [x] **Vite Setup**:
  - [x] Initialize React/TS project in `spa/`.
  - [x] Configure Tailwind CSS v4 Alpha and Geist fonts.
- [x] **UI Migration**:
  - [x] Port `global.css` and custom `.prose` overrides.
  - [x] Implement client-side theme switching (including a manual toggle in the Navbar).
  - [x] Port all shared components (`nav`, `footer`, `recaptcha-provider`).
  - [x] Port `not-found.tsx` to a React Router catch-all `*` route for 404 handling.
- [x] **MDX & Content**:
  - [x] Set up `@mdx-js/rollup` for build-time MDX compilation (with `remark-gfm` and `sugar-high` support).
  - [x] Port `mdx.tsx` components (replacing `next/link` and `next/image`).
  - [x] Implement SEO metadata via react-helmet-async (Done for all pages).
  - [x] **Static Asset Generation**: Implement build-time script to generate `sitemap.xml`, `robots.txt`, and `rss.xml`.
- [x] **Features**:
  - [x] Implement Blog index with client-side sorting, tag filtering, and pagination.
  - [x] Implement Career, Projects, and Library pages.
  - [x] Implement Contact Form with ReCAPTCHA v3.
  - [x] Implement Post Interactions (Likes/Comments) with consistent reCAPTCHA usage (including comment likes).
  - [x] **Admin Dashboard Migration**: 
    - [x] Port the moderation UI to the SPA.
    - [x] Update `PUT`/`DELETE` calls to include both `slug` and `commentId`.
- [x] **Testing**:
  - [x] Write Vitest/RTL tests for all components (80% coverage target).
  - [x] Fix Vitest configuration to exclude e2e tests and mock global browser APIs.
  - [x] Set up Playwright for E2E testing of core user journeys.

## Phase 5: Audit & Validation
- [x] **Audit & Validation**:
  - [x] Perform a full UI audit to ensure 1:1 design match.
  - [x] Verify security of admin endpoints (both UI and API).
  - [x] Validate SEO tags and Open Graph images.
  - [x] Run full test suite and security scans.

## Phase 6: Deployment & Go-Live
- [ ] Deploy infrastructure via Terraform.
- [ ] Deploy backend Lambdas.
- [ ] Build and deploy SPA to S3.
- [ ] Perform DNS cutover (Route 53).
- [ ] Final production smoke test.
