# Website and marketplace changes

Implemented in the editable `source/` application. `deployment/` is refreshed from the validated build. No production migration, push or deployment is performed as part of this work.

## Visitor experience

- Pinned header; Marketplace, How it works and About us in that order. Marketplace uses `#df553f` and black text. The current navigation item has a visible selected state. Pre-registration has been removed from all visitor pages.
- About us uses the supplied copy. How it Works describes account completion, saved listings, bidding, negotiations and seller review.
- Body copy, form controls and secondary content are larger. Heading and brand sizes retain the existing design.
- All three home project cards use the same white layout and dimensions. Project artwork uses `object-fit: contain`, preserving the complete picture and its aspect ratio.
- Clean paths such as `/`, `/marketplace`, `/listing/AH-DEMO-1001` and `/account`. Server routes support direct loading and refresh. Legacy hash links are converted once on entry, and old `/listing/axis` and `/listing/executive` links redirect to the new demos.

## Listings, bids and negotiation

- D1 stores listings, bids, listing-specific bidding IDs, favourites, versioned terms acceptance, private negotiation requests and event history. All money is integer paisa; forms take whole PKR. A listing's price, bids, increments and negotiation amounts use its selected price unit consistently.
- The two seeded demos start at Rs 200,000 (2 Lac), lump sum, with increments of Rs 20,000 / 40,000 / 60,000. For example, after Rs 240,000 the choices are Rs 260,000 / 280,000 / 300,000. Demo bids are persistent practice records and collect no money. Demo listings close seven days after the migration first runs; their timers do not restart on page refresh.
- Listing details link to a numbered Facts and Terms page. Enter Bidding requires login and a complete profile, then opens an approximately 80% viewport modal with a blurred backdrop. Scrolling to the bottom unlocks agreement; agreement unlocks Continue. The server requires acceptance of the listing's current terms before accepting a bid.
- Bidding shows the property, selected price unit, days/hours/minutes/seconds, three next amounts, confirmation and newest-first bid history. IDs use the last four listing digits and four random English letters. Public history does not expose account identifiers or contact details.
- Bids and negotiation responses use atomic, conditional D1 operations to reject stale or simultaneous conflicting actions. Sellers cannot bid on their own listings.
- No-bid listings show Request Seller for negotiation after the holding period. The request appears in the seller's My Listings panel. Notifications are in-app; no email/SMS is claimed or sent.
- Only the approved requester sees Enter Negotiation. Separate negotiation terms are required. One live private negotiation pauses ascending bidding. Offers decrease by one published interval, seller counteroffers increase by one interval, and the response timer restarts on each turn, capped by the listing's end. Expiration ends the private session; agreement closes bidding. A negotiated agreement requires a separate administrator-reviewed deal for fees, payment and transfer.
- Demo sellers cannot receive negotiation requests. The complete private negotiation flow works between real registered seller and bidder accounts, and is exercised using synthetic accounts in local tests.

## Seller and account experience

- Sell your file opens Let's Start with Choose from Project and Enter your own listing. Both collect price unit, three bid increments, a schedule, holding period, negotiation increment and response time, line-by-line facts, bidding terms and separate negotiation terms.
- The supplied Pine Axis / Pine Executive category, block and plot ranges are shared by the form and server validation in `source/app/lib/inventory.ts`. Plot controls appear only for Plot Allotted. The alternative is File is Allotted, Waiting for Plot Allotment. Custom properties allow a supplied HTTPS image URL, area in Marla, address and plot details.
- New seller listings are pending until an allowlisted administrator verifies ownership and approves them at `/admin/listings`. The existing administrator account and deal desk remain available. Published listing inputs are fixed; there is no silent change to agreed facts or increments. A seller can withdraw an unbid listing without a live negotiation.
- Member accounts have My Biddings, My Interests (hearts), My Listings and Account settings. Bid and favourite lists include active, unexpired listings. Seller listings include pending and closed records and private request controls.
- Members can change their name, mobile and password. Password changes revoke other sessions. Email and CNIC remain fixed. Google registration still requires profile completion with CNIC, verified Google email and mobile; a password is not required.
- Permanent account deletion removes personal profile fields, sign-in credentials, sessions, recovery tokens and saved interests. Anonymous identifiers and transaction history remain for record integrity. Active bids/listings/negotiations/deals block deletion. Password accounts confirm their current password; Google-only accounts must have signed in within 15 minutes.

## Local validation and review

Run from `source/`:

```text
npm run typecheck
npm run build
node scripts/test-accounts.mjs
npm run test:deals
npm run test:auctions
npm run test:browser
npm run deploy:package
```

The browser suite uses an installed Chrome-compatible browser, a temporary profile, local HTTP server and isolated D1 database. Set `AUCTIONHOUSE_BROWSER` to its executable if needed. It saves desktop/mobile review screenshots in `review/`, including the terms modal, bidding, seller form and both negotiation roles. Account tests, deal tests and auction tests use synthetic local data and never write to production D1. Google callback credentials and real Google-provider behaviour still require a separately configured live integration; local tests exercise profile completion and return-path behaviour.

Before releasing, apply the new `0002_yummy_rumiko_fujikawa.sql` migration using the existing deployment procedure. It adds the marketplace tables and demo seeds without changing earlier migrations or existing accounts/deals. Existing Cloudflare account authorization and provider onboarding remain separate release work. The current CI workflow has not been changed or resumed.
