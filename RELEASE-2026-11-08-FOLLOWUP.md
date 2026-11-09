# Flowchart, account separation and review fixes — 08 Nov, 2026

Prepared locally; production has not been changed.

- Recreated the supplied flowchart as responsive SVG with sketched rectangular cards, hatched shadows, lime arrows and separate LDA/Sell now/Marketplace link callouts. The same chart is included in server-rendered home content. The supplied raster is a visual reference, not a website dependency.
- My Account renders only interests, deals, balance and settings from its first frame. My Biddings and My Properties have separate renderers and routes. The obsolete Saved Searches renderer is removed; legacy account URLs redirect to the appropriate separate page.
- My Properties renders Edit and resubmit, Enable/Disable negotiation and Withdraw controls directly below the starting-price amount. The three actions use distinct pale blue, green and red colours. Their existing status/authorization restrictions remain in force.
- My Biddings cards have one large **Enter Bidding Page** link to the same property-details URL formerly used by View listing. No next-bid amount buttons are rendered on the summary page. Existing participants still see bid choices on the detailed property/bidding page.
- Status labels are **You are highest bidder till now** and **You are not highest bidder, place higher bid**; the latter uses red text. Highest Bid replaces Last Bid, and Refundable Token Money replaces the former bid-token label.
- Pending-review cards have a separate Refundable Token Money form/action. Sending its requirement does not submit a property draft or require observations. Custom-property money must be set/sent before approval or observations. Project money is read-only here and remains configured in AH Projects.
- Observations are optional when sending a changed draft. Seller rejection still requires a reason. Active/accepted properties do not show old Auction House observations to the seller. Approval/funding clears the active property's review-note field; audit and notification history remain available.
- Permanent admin deletion is at the bottom of user details. The confirmation button stays disabled until `DELETE` is entered. The server also requires that exact word; a boolean confirmation alone is rejected. Existing financial/active-commitment guards remain.
- Negotiation offers/counters/reopening must differ from the current offer by a non-zero whole multiple of the configured negotiation interval. The existing 40% floor, below-starting-price ceiling, own-offer monotonicity and strict improvement on reopening remain. The interface adjusts in those multiples and the server rejects manually entered off-grid amounts. Existing off-grid negotiations use their current offer as the interval anchor.
- Demo/orphan properties cannot send a seller reminder. Their reminder action is hidden, and direct requests return an explanatory error instead of attempting to insert a notification with a null recipient. Real-property reminders retain their highest-bidder and one-hour checks.

No additional schema migration is needed for this follow-up. The latest required database migration remains `0007_fearless_black_tom.sql`. Preserve the existing DB, BUCKET, LIVE_HUB and encryption/provider secrets.

## Transfer to production

1. Back up production D1 and choose a maintenance window if real bidding is active.
2. Open `deployment/` in PowerShell, run `npm.cmd ci`, `npm.cmd run login`, and `npm.cmd run whoami`.
3. Check the existing database/bucket/secrets and keep the original PII encryption key. Do not recreate resources.
4. Run `npm.cmd run check`.
5. Inspect `npx.cmd --no-install wrangler d1 migrations list DB --remote --config wrangler.json`. Run `npm.cmd run database` if any earlier migration is pending; this follow-up adds none beyond 0007.
6. Run `npm.cmd run deploy` and wait for success.
7. Hard-refresh the live website and verify the chart links, refresh/back navigation on My Account, summary-to-bidding entry, inline property controls, separate token requirement, optional draft observations, typed DELETE, interval validation and real seller reminders.

Testing uses isolated synthetic accounts and storage. Desktop/mobile screenshots are in `review/v5-*.png`; they are updated by the browser suite.
