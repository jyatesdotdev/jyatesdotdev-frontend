# Blog Post Outline: Building a Serverless Portfolio From Scratch on AWS

## PlantUML Diagrams (copy into your MDX post)

### Architecture Diagram
```
<PlantUML>{`
@startuml
!theme plain
skinparam backgroundColor transparent
skinparam defaultFontColor #333333

title Site Architecture

cloud "Edge" {
  [Route53 DNS] as DNS
  [WAFv2 Rate Limiting] as WAF
  [CloudFront CDN] as CF
  [CloudFront Function\\nSPA Rewrite] as CFF
}

node "Origins" {
  [S3 Static Site\\nReact SPA] as S3
  [API Gateway REST\\nAPI Key Auth] as APIGW
}

node "Compute" {
  [Interactions\\nLikes & Comments] as LInt
  [Contact\\nEmail via SES] as LCon
  [Admin\\nModeration] as LAdm
  [Authorizer\\nBasic Auth] as LAuth
}

database "Storage" {
  [DynamoDB\\nSingle-Table] as DDB
  [SSM Parameter Store] as SSM
  [SES v2\\nEmail] as SES
}

node "Observability" {
  [Cognito Identity Pool] as COG
  [CloudWatch RUM] as RUM
  [Budget Guard\\n$10/mo Hard Stop] as BG
}

DNS --> WAF
WAF --> CF
CF --> CFF
CFF --> S3
CF --> APIGW : /api/*
APIGW --> LAuth
APIGW --> LInt
APIGW --> LCon
APIGW --> LAdm
LInt --> DDB
LAdm --> DDB
LCon --> SES
LAuth --> SSM
S3 ..> COG : RUM Telemetry
COG --> RUM
BG ..> COG : Deny Policy\\nWhen Exceeded
@enduml
`}</PlantUML>
```

### Budget Guard Flow Diagram
```
<PlantUML>{`
@startuml
!theme plain
skinparam backgroundColor transparent
skinparam defaultFontColor #333333

title RUM Budget Guard Flow

start
:Visitor loads page;
:RUM SDK sends events via Cognito;

if (Monthly RUM cost < $10?) then (yes)
  :Events accepted;
  :Performance, errors, HTTP,\ngeo data recorded;
else (no)
  :AWS Budget triggers action;
  :Deny policy attached\nto Cognito role;
  :PutRumEvents calls\nsilently rejected;
  :SDK .catch() handles\ngracefully;
endif

:1st of next month;
:EventBridge cron fires;
:Lambda detaches deny policy;
:RUM re-enabled;

stop
@enduml
`}</PlantUML>
```

---

## Outline

### 1. Why Rebuild?
- Was on Next.js/Vercel — worked fine but abstracted everything away
- Joined Amazon, using AWS daily, wanted to apply that knowledge to own projects
- Wanted full control over the infrastructure
- Goal: serverless portfolio, zero servers, everything in Terraform, OIDC deploys
- Heavy use of AI assistant — compressed weeks into a couple of days

### 2. Architecture Overview
- Four repos: frontend (React SPA), API (Go Lambdas), infra (Terraform), private bootstrap
- Why the bootstrap repo exists (chicken-and-egg: state bucket + deploy role must exist first)
- **[Architecture PlantUML diagram]**

### 3. The CloudFront Puzzle
- SPA routing: CloudFront Function rewrites paths to index.html, but must skip /api/*
- The 403 vs 404 trap: S3 returns 403 for missing objects without s3:ListBucket
  - Custom error response for 403 was catching API errors too
  - Fix: add s3:ListBucket (S3 returns 404), remove 403 fallback, keep only 404
- Code snippet: the CloudFront Function guard

### 4. Production Bug Parade
- AI helped trace bugs across repos — would've taken hours manually
- **Likes not toggling**: X-Forwarded-For full chain as dedup key, trailing IPs change per request. Fix: extract first IP only
- **Contact form broken (3 bugs stacked)**: recaptchaToken vs token, contact_form vs contact, SES IAM policy too narrow for SESv2
- **Comment likes**: reCAPTCHA action mismatch (comment_like vs like_comment)
- **Theme toggle**: "system" didn't resolve to actual dark/light
- reCAPTCHA action map table to prevent future drift

### 5. Security Scanning & Supply Chain
- Needed scanning before making repos public
- tfsec (deprecated) → Trivy (supply chain compromise March 2026) → Checkov
- AI flagged the Trivy compromise — easy to miss without tracking advisories
- CodeQL for Go and TypeScript
- Audit before going public: secrets to GitHub Secrets, resource IDs redacted, bootstrap stays private

### 6. Observability with CloudWatch RUM
- Real user monitoring without third-party services
- Cognito Identity Pool for unauthenticated browser access (scoped to rum:PutRumEvents only)
- SDK loads lazily — no bundle cost on pages without it
- 10% sampling = zero data with low traffic (sampling is client-side, SDK drops entire session)
- Bumped to 100%, immediately saw events
- Auto-captures geographic data (country, subdivision, city)

### 7. The Budget Guard
- The "what if this goes viral?" question
- RUM cost is fine ($1/100K events), but Cognito is the risk ($0.0055/user after 50K free tier)
- No native AWS spending cap for RUM, so built one
- Four components: AWS Budget (scoped to RUM), Budget Action (attaches deny policy), Lambda (detaches policy), EventBridge cron (monthly reset)
- **[Budget Guard PlantUML diagram]**
- Hard stop at IAM level, SDK fails silently, auto-resets monthly

### 8. Lifecycle Rules & Housekeeping
- Static site: 30-day noncurrent version expiry (rollback window)
- Access logs: 90-day expiry
- Lambda artifacts: 14-day expiry (can rebuild from source)

### 9. Pipeline Design
- GitHub Actions + OIDC, no static credentials
- API builds → uploads zips → dispatches to infra repo
- Infra runs Terraform apply with artifact params
- Frontend builds → S3 sync → CloudFront invalidation
- Concurrency group on infra workflow to prevent state lock races

### 10. What It Costs
- $0.009 after 18 days, ~$6.50/month projected
- WAF: ~$5 (77%), Route53: ~$0.50, KMS: ~$1, everything else: fractions of a cent
- KMS key is debatable — AWS-managed keys are free

### 11. Lessons Learned
- **Test the full request path** — things work in isolation but break end-to-end
- **CDN error handling is global** — custom error responses apply to entire distribution, not per-origin
- **Match sampling rate to traffic** — 10% with 3 visitors/day = zero data
- **Security tools can be compromised** — pin versions, verify what you run in CI
- **Do the boring stuff** — lifecycle rules, concurrency groups, rollback docs, lock cleanup
- **AI is a force multiplier, not a replacement** — speeds up boilerplate and tedious work, but makes mistakes you need to catch (logo, sampling rate, import compat)
- **AI won't ask the security questions** — won't proactively flag IAM gaps, cost exposure, or threat models. Budget guard only exists because you asked the right question
- **AI will happily burn your money** — defaults to feature-complete over cost-efficient. Treat every resource it suggests as a line item on a bill

### 12. What's Next
- SES production access (pending)
- Comment rejection notifications (blocked by SES)
- More blog posts
- Links to all three public repos
