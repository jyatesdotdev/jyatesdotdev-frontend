# The jyates.dev Frontend Journey

This is the narrative behind the frontend: how a static personal site became a
prerendered application, an observable production system, and eventually a small
browser desktop. It records design intent and lessons learned; current code and the
nested `AGENTS.md` files remain the operational contracts.

## From portfolio to application

The project began as a React portfolio with familiar pages: home, blog, career,
projects, library, and contact. The important architectural constraint was less
visible: the finished site had to live on S3 behind CloudFront without an always-on
server.

React Router framework mode stayed, but server rendering did not. With `ssr: false`,
the build prerenders every known static route and emits an SPA fallback for client-side
navigation. A CloudFront function maps directory-like URLs to their `index.html`
objects, while API requests pass through untouched. This kept route metadata and fast
initial HTML without pretending S3 could host a React Router server.

The deployment path matured with the application. GitHub Actions now runs the sibling
integration repository's LocalStack suite against exact revisions, builds with OIDC-
issued AWS credentials, uploads cache classes in a deliberate order, invalidates
CloudFront, and verifies the deployed revision before considering a release complete.

## Content became a build product

Blog posts live as MDX, but publishing is more than copying source files. The build
discovers public posts, prerenders their routes, generates sitemap, robots, and RSS
assets, and turns PlantUML blocks into local SVG files. Drafts stay out of public route
discovery.

That same build boundary later became the trusted source for content notifications.
The deployment compares revisions, emits a manifest only for newly public posts or
new projects, and lets the backend queue subscriber email after deployment succeeds.
Visitors choose blog and project topics explicitly and confirm ownership through an
emailed link.

## Observability without surrendering local development

Production uses AWS RUM, but components report through a small `window.awsRum`
boundary rather than coupling every feature directly to the SDK. Local development
provides a compatible telemetry sink, so error and interaction paths remain testable
without production credentials.

A once-per-session visit beacon also became a user-facing feature. The backend derives
coarse location at the edge, and the visitor-map tool renders aggregated countries as
a lazy-loaded world map. Keeping the map data in a separate chunk preserved the cost
profile of an otherwise small portfolio homepage.

## The navbar became a desktop

The first playful step was a tools dropdown with a terminal in a draggable window.
The terminal was intentionally browser-only: a safe shell-shaped portfolio rather
than remote command execution. Its command registry grew into navigation, manuals,
completion, pipelines, persistent user files, live location and status commands, and
a deterministic on-call incident lab.

The visitor map proved the window was a platform rather than a terminal-specific
frame. Games, lab, and research then joined the navbar as future registries. Their
first shared entry is deliberately nostalgic: an animated pixel worker, moving hazard
tape, and a hammer strike in the style of 1990s under-construction pages.

Mobile input exposed a browser rule that desktop testing hides: software keyboards
cannot be summoned by arbitrary asynchronous focus. Terminal mounting is therefore
synchronized with the originating menu tap, and touch devices get a direct keyboard
button as a reliable second gesture.

## Making multiple windows real

Rendering two portals was not enough to create desktop behavior. A fixed z-index made
DOM order permanent, and each menu originally stored only one selected item, so a new
launch replaced the previous window.

The final model has two distinct responsibilities:

1. Menu controllers own arrays of independent tool or section instances. Closing one
   filters only that instance, and route changes do not erase open windows.
2. `ToolWindow` owns shared desktop mechanics. Live windows register globally, new
   windows cascade by 32 pixels, pointer or keyboard focus raises the selected window,
   and Escape is routed only to the foreground instance.

The cascade is functional, not decorative: it leaves the previous title bar exposed
when two windows open at the same default position. Dropdown menus use a separate
higher layer so users can always launch or switch experiences.

## The engineering pattern

The frontend's recurring pattern is to keep playful behavior behind explicit,
testable boundaries:

- command execution is a pure function with injected effects;
- tool-specific UI is separate from generic window mechanics;
- heavy map dependencies load only when requested;
- static content discovery happens during the build;
- production release waits for cross-repository E2E and deployed-revision checks;
- responsive and multi-window behavior is exercised in both component and browser
  tests, with visual snapshots guarding the stable pages.

The site still reads first as a personal portfolio. The richer pieces are there for
visitors who explore, and the architecture now has a clear place for the actual games,
lab experiments, and research material that will replace today's construction signs.
