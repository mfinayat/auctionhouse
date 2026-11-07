# AuctionHouse.pk — deploy to your own Cloudflare account

Prepared for:
- Existing Worker: `auctionhouse`
- D1 database name: `auctionhouse-db`
- D1 Database ID: `dbe669e5-40e1-45e6-b953-66fbc2e3c908`
- Binding name: `DB`
- Target domain: `auctionhouse.pk`

## First deployment (Windows / VS Code)

1. Install Node.js 22.13 or newer (a supported LTS release) if `node --version` is unavailable. Open a new terminal afterwards.
2. Extract this ZIP completely. Open the extracted `AuctionHouse_Cloudflare` folder in VS Code.
3. In VS Code open a **Command Prompt** terminal (Terminal > New Terminal; select Command Prompt from the terminal profile menu). This avoids PowerShell blocking `npm.ps1`.
4. Run each command in order:

```bat
cd deployment
npm install
npm run login
npm run database
npm run setup-key
npm run deploy
```

- `npm install` installs the pinned Cloudflare deployment tool; this folder already contains the built website.
- `npm run login` opens your browser. Log in to the same Cloudflare account where you created `auctionhouse` and `auctionhouse-db`, then authorize Wrangler.
- `npm run database` applies the account and interest tables to your D1 database. If prompted to apply migrations, confirm. If the migration is already applied it is skipped.
- `npm run setup-key` generates a random encryption key locally and uploads it directly as a Worker secret. It does not print the key or put it in a file. An existing key with the same name is preserved. Run this before accepting registrations.
- `npm run deploy` replaces the Hello World code in your existing `auctionhouse` Worker and uploads the website assets. It does not change the nameservers or attach your custom domain automatically.

If you have multiple Cloudflare accounts, choose the account holding this Worker and database. `npm run whoami` shows your account context. For authentication or permission errors, stop and use the error message to check the selected account; do not create duplicate Workers/databases.

## Test before nameservers finish updating

Open the Worker address already shown in your dashboard:

`https://auctionhouse.bunburgerchai.workers.dev`

Confirm that the homepage, Marketplace, Create account and Log in pages load. Create your own account, save a listing with its heart button, and try a demo bid to verify your new database.

## Connect auctionhouse.pk after it becomes Active

In Cloudflare, open your Worker and its **Domains** tab, or **Settings > Domains & Routes** depending on your dashboard layout. Add a **Custom Domain** for:

- `auctionhouse.pk`
- `www.auctionhouse.pk`

Cloudflare creates the DNS records and certificate for those Worker hostnames. If a conflicting web DNS record exists, review that conflict before replacing it; preserve email DNS records.

This package uses `SITE_ORIGIN=https://auctionhouse.pk`. That is the final address used for email links and Google callbacks. Normal email/password login also works while testing the workers.dev address.

## Google login and password-recovery emails

Email/password registration and login work once the database and encryption key are configured. Google and recovery email delivery still require your own provider credentials.

In the Worker settings, configure:

| Name | Type / purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth web-client identifier; store as a secret if preferred |
| `GOOGLE_CLIENT_SECRET` | Secret |
| `RESEND_API_KEY` | Secret for the email sender |
| `EMAIL_FROM` | Verified email sender, for example `AuctionHouse <accounts@auctionhouse.pk>` |

For the Google web OAuth client, register this authorized redirect URI:

`https://auctionhouse.pk/api/google/callback`

Configure and test Google sign-in from `auctionhouse.pk` after domain activation. The requesting hostname and callback must use the same origin so the OAuth state cookies are available. The application asks for identity (name/email), not Gmail inbox access.

For emailed recovery, verify your sending domain with the email provider and add its DNS records in Cloudflare. The app reports when delivery is unavailable; it does not claim to have sent an email without a configured sender.

## Worker plan and password hashing

The domain’s Free plan is separate from the Workers compute plan. This application uses bcrypt cost 12 for passwords. Cloudflare Workers Free has a 10 ms CPU limit per request, so registration/login may exceed that compute budget. See https://developers.cloudflare.com/workers/platform/limits/ for the current limits. Use a Workers plan/CPU limit suitable for the login backend before accepting real registrations; CPU-limit failures are not DNS problems.

## Encryption key and existing records

Keep the Worker's `PII_ENCRYPTION_KEY` secret stable. Do not delete or rotate it after account registrations without a data migration plan. The setup command preserves an existing key.

This package initializes the new database you supplied. It contains no user data, passwords, provider keys or secrets from the ChatGPT-hosted version. Existing accounts from that version are not automatically copied.

## Editing the website later

For automatic checks and deployments from GitHub, follow [CI-CD.md](CI-CD.md). The workflow rebuilds the editable source, runs regression checks, and deploys successful `main` builds using GitHub environment secrets.

The `source` folder contains the editable application and its independent Cloudflare configuration. See `source/README.md`. The `deployment` folder is the ready-built version for the first deployment; editing `source` does not update it until you rebuild and package it.

## Troubleshooting

- **`node` / `npm` not recognized:** Install Node.js, close/reopen your terminal and VS Code.
- **PowerShell script execution error:** Use the Command Prompt terminal profile, or run `npm.cmd` instead of `npm`.
- **Database not found / unauthorized:** Verify the Cloudflare account selected by Wrangler owns the supplied Database ID.
- **Worker not found:** Your Worker must be named exactly `auctionhouse` in that same account.
- **Account security is being configured:** Run `npm run setup-key`, then deploy again if necessary.
- **No such table:** Run `npm run database` against the supplied remote database.
- **Nameservers pending:** Use the workers.dev address for testing, then attach custom domains once the zone is Active.
- **Google login or recovery unavailable:** Configure the provider settings listed above.

Validation: standalone production build and Wrangler dry run passed. Actual deployment into your Cloudflare account is performed by you after `npm run login`.
