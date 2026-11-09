# UX, auction closing rules and public-page update — 07 Nov, 2026

Latest release: [08 Nov customer, token, negotiation and administration changes](RELEASE-2026-11-08.md). This supersedes the earlier saved-search, fixed-step negotiation and password-format behavior. Apply pending migrations through 0007 when deploying.

This update is prepared locally. It has not migrated or deployed production, changed production credentials, or sent real email.

## Included changes

- Page Settings now controls the home heading, introduction, title, search description and optional deadline banner. Defaults describe the property marketplace without an old ballot deadline. A configured banner disappears after its deadline, including while its page stays open.
- Public home, Marketplace, listing, listing facts, About, How it Works, Contact, fees and privacy pages contain server-rendered content. Public listings have individual titles, descriptions, canonical links and Open Graph image previews. Missing pages return 404. Private routes use noindex and no-store; robots.txt and sitemap.xml identify public routes.
- Public documents require revalidation rather than being universally marked no-store. Content-hashed bundles combine the customer CSS and JavaScript into one file each and can be cached immutably. Regenerate them with `npm run build`; do not edit generated bundles. Run `node scripts/bundle-assets.mjs` before a development preview after changing public scripts/styles.
- Project posters have 320px and 640px WebP variants with responsive sources, lazy loading and intrinsic dimensions. The 320px variants are about 24–28 KB each. Images retain their aspect ratios; thumbnails use contain rather than cutting off property posters.
- The mobile header keeps the logo, a notification bell/count, Sell now and the menu button. Account, login and logout links appear inside the menu. The Marketplace tab retains the requested orange background and white text, with a larger bold font for contrast.
- A successful bid in the final five minutes atomically extends the close time until five minutes remain. Each subsequent late bid can extend it again. Competing or rejected bids cannot alter the closing time. Early bids preserve the existing end time. The rule is disclosed with the auction terms and the actual closing time is shown in Pakistan time.
- Explicit confirmation remains required for every bid. Automatic maximum bidding is excluded at the user's request. Urdu is also excluded at the user's request.
- The bidding page and My Biddings show whether the customer is currently winning or has been outbid. Customers who have never bid do not receive an outbid label. Final-hour countdowns turn red and have a mobile countdown bar. Live changes update the timer without replacing the listing DOM.
- Bid popups are grouped into one updating notification card per listing. The inbox retains the individual records and email queue.
- Marketplace supports project, price, area and land-use filters, no-bid filtering and ending/newest/price sorting. Filtering and sorting run on the server with twenty-four results per page and bounded card responses. Desktop cards use a responsive three/two-column grid and mobile uses one column. Mobile filters are collapsible. Prices are filtered in each listing's stated per-unit mode; area filters use Marla, with the Kanal conversion shown.
- Customers can save up to twenty named searches and delete them from My Account. A matching successful listing approval creates an inbox/email notification atomically with approval. Alerts match project, starting price, area and land use; transient sorting and current bid status are not saved. Searches and deletion are account-isolated.
- Listing details include WhatsApp sharing, optional explicit ownership-document verification, seller registration date and the count of documented completed seller deals. Approval alone does not assert document verification: a reviewer must check the verification control, and supporting documents must exist. Private attachments and pending listing review data require the seller's session or staff review permission.
- The cost estimator uses the actual listing deposit and an optional administrator-configured buyer fee in basis points. It handles per-unit prices, uses integer-paisa arithmetic, and rejects unsupported totals. An unconfigured fee remains unconfigured rather than claiming a zero fee. The calculator does not change issued fee agreements or include government taxes and third-party charges.
- A floating WhatsApp link uses the configured contact number. Skip navigation, visible focus outlines, stronger text contrast, loading placeholders and screen-reader bid announcements improve accessibility.
- Worker responses have a script-restricting Content Security Policy, frame denial, nosniff, referrer policy, permissions policy and HTTPS transport policy. Existing private-file sandbox policy is retained. Inline styles remain permitted because the retained UI uses style attributes; inline scripts and inline event handlers are not permitted.
- Administrator accounts can configure security email addresses. All enabled staff with configured email receive a durable email alert for a new-device administrator login. A random HttpOnly device cookie identifies a known device; no new-device alert is created on a failed password attempt. The initial owner must set a real security email after changing the bootstrap password. New staff accounts require email. This implements the suggested minimum alerting control, not authenticator-based MFA.
- Bids have both an IP limit and an account limit of twelve attempts per minute; changing IP does not bypass the account limit. Live WebSocket upgrades check origin, authentication/visibility and connection rates. Each channel allows at most four connections per customer/IP tag and 2,000 connections overall.

## Live updates

`LIVE_HUB` binds the exported `LiveHub` Durable Object. A SQLite-backed namespace is created by the `live-hub-v1` Wrangler migration. The implementation uses Cloudflare's WebSocket Hibernation API:

- One channel per listing carries public refresh signals; a separate account channel carries private notification refresh signals.
- Only the Worker can publish signals to the object. Clients cannot publish bids or notifications through the socket.
- D1 transactions remain authoritative for bids and money. After successful API writes, background broadcasts prompt the relevant browsers to read current authorized data.
- There is no one-second D1 polling per open viewer. Sockets reconnect after disconnect and fetch the latest state on connection; the ordinary `/api/live` HTTP endpoint returns 426.
- Notification rows and their email outbox remain durable. Live refresh signals are transient and can be missed during an infrastructure interruption; reconnect, page navigation or reload retrieves current state. This is not a claim of guaranteed message delivery or a completed production load test.

References: [Cloudflare WebSocket Hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [hibernating server example](https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/).

## Deployment and operator setup

1. Review this changed auction rule and arrange an announced maintenance window if real auctions are already running. Do not silently change rules during active participation.
2. Back up production D1 and preserve the original PII encryption key and existing provider secrets.
3. Build and test from `source/`, then run `npm run deploy:package` to refresh `deployment/`. Do not deploy stale generated bundles or a Worker without its namespace configuration.
4. From `deployment/`, run `npm run database`. The additional migration is `0006_superb_wendell_rand.sql`. It adds saved searches, staff devices/security emails and explicit document verification. It also increments terms versions on active/pending listings, requiring fresh acceptance of the new closing rule. Previous acceptance records and closed-deal snapshots remain intact.
5. Run `npm run check`, then deploy the reviewed package with `npm run deploy`. Wrangler applies the `live-hub-v1` Durable Object namespace migration as part of Worker deployment; it is separate from the D1 migration. Ensure the configured Cloudflare account can create/use the namespace. Do not rename or remove an existing namespace/migration tag on later releases.
6. In Page Settings, review the home copy and any banner deadline. In Account Settings, configure the buyer fee estimate if desired and set the owner's security email. Confirm every other administrator has the correct security email.
7. Reviewers should enable the verified badge only after actually verifying uploaded ownership documents.
8. Verify real Google sign-in, inbox delivery/retries, private R2 uploads, two-browser live bidding/notifications and the new closing time in the deployed environment. Restore drills, production capacity testing and operational monitoring remain release responsibilities.

No production release or CI/CD troubleshooting was resumed automatically. Online PayFast payments remain disabled.

## Verification

The release checks include TypeScript, the production build, account and financial regressions, the expanded platform suite, real desktop/mobile Chrome flows, and the compiled Worker in isolated Miniflare D1/R2/Durable Objects. Synthetic tests cover competing late bids, stable close times after rejected/early bids, fresh terms consent, saved-search isolation/approval alerts, explicit document verification, staff new-device notices, account throttling, server-rendered content/metadata/404s, WebSocket origin checks, committed-bid broadcasts and connection caps.

Browser screenshots for this update are `review/v4-*.png`. Browser tests use a local WebSocket adapter; compiled Worker tests separately exercise the actual Durable Object. No synthetic email is sent to a real customer.
