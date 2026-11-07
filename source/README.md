# Editable AuctionHouse.pk source

This is an independent Cloudflare/Vinext project. It does not require the ChatGPT Sites plugin, a source credential from ChatGPT, or any access to the original hosted Site.

## Requirements

Node.js >=22.13 and npm. Commands work in a Windows Command Prompt terminal, macOS Terminal or a Linux shell.

## Install and build

```sh
npm install
npm run typecheck
npm run build
npm run deploy:package
```

The final command refreshes the sibling `deployment/server`, `deployment/client`, migrations and deployment configuration from this source build. It preserves the deployment folder's package.json, lockfile and encryption-key helper. Then open `../deployment` and run `npm run deploy` after authentication/setup.

For local development, create an untracked `.dev.vars` containing a random base64-encoded 32-byte `PII_ENCRYPTION_KEY`, initialize local D1 tables, then run `npm run dev`. Local databases are separate from the supplied remote D1 database. Do not copy production accounts into a local development database.

## Configuration

`wrangler.jsonc` contains the Worker name, exact supplied Database ID, DB binding, migrations location and final domain origin. Vite uses the official Cloudflare plugin and preserves these values in its generated Worker configuration. All secrets belong in Cloudflare's Worker settings or local ignored `.dev.vars` files; never in source.

`db/schema.ts` is the schema declaration. Applied SQL migrations in `drizzle/` must not be changed; append new migrations when updating tables. Use `npm run db:generate` for a schema change and apply the new migrations before deploying dependent code.

## Main files

- `public/app.js`: interactive homepage, marketplace, registration/login and interest pages.
- `public/style.css`: responsive design.
- `public/assets/`: project artwork optimized for delivery.
- `app/shell.ts`: site header/footer and page shell.
- `app/api/[...path]/route.ts`: account, Google OAuth, recovery and interest API.
- `app/lib/accounts.ts`: sessions, password hashing, encryption and reset-email delivery.
- `app/lib/validation.ts`: server-side profile, CNIC-format, password and mobile validation.
- `worker/index.ts`: standalone Worker entry point.

The marketplace supports moderated seller listings, persistent demo bidding, favourites and private negotiations. Demo bids are practice only and do not collect money. See [WEBSITE-IMPROVEMENTS.md](../WEBSITE-IMPROVEMENTS.md) for workflow details, migration requirements and browser screenshots.

## Account regression checks

The admin deal desk, 0.50%–2.00% service fees, participation deposits and settlement/payout ledger are documented in [ADMIN-AND-PAYMENTS.md](../ADMIN-AND-PAYMENTS.md), including operator setup and the pending PayFast Pakistan onboarding. Access the admin panel through `/admin` and customer deals through `/deals`.

After building, `node scripts/test-accounts.mjs` exercises validation, password hashing, encrypted profile storage, login/session controls, protected interests and single-use recovery tokens against an isolated temporary database. Email delivery is intercepted in this test; it does not send messages or write to the supplied remote database.

After building, `npm run test:deals` exercises the new deal/payment/settlement flow against all migrations in a separate temporary local D1 database.

Run `npm run test:auctions` for bidding, negotiation and account-setting regression checks. Run `npm run test:browser` for desktop/mobile Chrome checks against synthetic local data.
