# AuctionHouse.pk website improvements

Current release: [09 Nov token entry, Projects Info, Formats, account and live-update fixes](RELEASE-2026-11-09.md). Apply the new **0008_orange_cargill.sql** migration before deploying this package. Project review token amounts are now editable, negotiation intervals use the starting-price grid, and token amounts are disclosed at first entry. The instructions below retain historical context; this release takes precedence where behaviour differs.

Latest follow-up: [reference flowchart, account separation, Token Money, interval and reminder fixes](RELEASE-2026-11-08-FOLLOWUP.md). This supersedes the earlier direct-bidding summary cards and arbitrary negotiation increments. No migration beyond 0007 is added.

Latest release: [08 Nov customer, token, negotiation and administration changes](RELEASE-2026-11-08.md). This supersedes the earlier saved-search, fixed-step negotiation and password-format behavior. Apply pending migrations through 0007 when deploying.

Latest follow-up: [UX, closing rules, SEO and security update](RELEASE-2026-11-07-UX-SECURITY.md). This adds migration 0006 and the LIVE_HUB Durable Object binding; keep the follow-up deployment instructions with this release.

The current update is documented in [RELEASE-2026-11-07.md](RELEASE-2026-11-07.md), including the requested website changes, seller workflow, notifications, administration modules, database migrations, validation and release steps.

The editable application is in `source/`. The validated build is packaged into `deployment/`. This work does not itself migrate or deploy the production website.

## Current visitor and customer pages

- `/`: administrator-selected home projects, sale methods and instalment plans.
- `/marketplace`: Active Biddings, favourites, bid status, land use and ownership labels.
- `/listing/:id`: gallery, property facts, current bid, countdown, terms and bid history.
- `/listing/:id/bid`: live bid updates, three amount buttons and a stable page/scroll position.
- `/listing/:id/negotiation/:negotiationId`: private seller/bidder negotiation.
- `/sell/project` and `/sell/custom`: project-derived or custom property forms, one bid interval, numbered terms, pictures and private documents.
- `/account`: My Interests, My Deals, Account balance and Account settings. `/my-biddings` and `/my-properties` are separate pages.
- `/notifications`: customer-specific notifications with property and bidding identifiers and confirmed deletion.
- `/projects-info/:slug`: public project information pages with links and configurable image placement; managed separately from AH Projects.
- `/how-it-works`, `/about`, `/contact`: configurable public content, illustrations and office map.

## Administration

`/budapest-admin` has separate staff accounts, sessions and role permissions. Modules cover AH Projects, seller field configuration, pending listing reviews, customer details and cash balances, closed deals and documentation, existing fees/settlements, home placement, site content and administrator accounts.

The initial account is `budapest` / `1010`. A password change is mandatory before accessing any administrator module. Customer email accounts and the legacy `ADMIN_ACCOUNT_IDS` allowlist do not grant staff access.

## Release requirements

The new release needs all pending D1 migrations, including `0003`, `0004` and `0005`; a private R2 bucket named `auctionhouse-uploads` bound as `BUCKET`; and configured email-provider credentials for notification delivery. The existing profile encryption key must be preserved.

Office-visit prompts use **“during office working hours”** until an administrator changes that wording. Missing or failed email delivery remains queued and retries; it is never represented as a successful send.

Follow the full release procedure in [RELEASE-2026-11-07.md](RELEASE-2026-11-07.md). Current desktop/mobile screenshots are in `review/v3-*.png`; older screenshots are retained as earlier review artifacts.

## Local checks

Run from `source/`:

```text
npm run typecheck
npm run build
node scripts/test-accounts.mjs
npm run test:deals
npm run test:platform
npm run test:browser
npm run test:worker
npm run deploy:package
```

The regression suites use synthetic accounts and isolated local D1/R2 storage. The email transport is intercepted in tests. Browser checks use an installed Chrome-compatible browser and a temporary profile. Real Google-provider login and actual email delivery require separately configured provider testing.
