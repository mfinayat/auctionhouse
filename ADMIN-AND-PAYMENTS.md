> Current administration: use `/budapest-admin` with separate staff credentials. Customer `ADMIN_ACCOUNT_IDS` allowlisting no longer grants access. The existing financial desk is available under Fees & Settlement. See [RELEASE-2026-11-07.md](RELEASE-2026-11-07.md) for current access, balances, notifications and release instructions. Older account-access instructions below are superseded; the financial policy remains applicable.

# AuctionHouse deal desk and participation payments

The editable implementation is in `source/`. Nothing in this change applies production migrations or deploys the Worker automatically. Your existing GitHub workflow is unchanged; pushing to `main` still triggers it.

## Agreed financial rules

All amounts are PKR, stored as integer paisa. Each deal fixes the agreed sale price, two independent service-charge rates (0.50%–2.00%), and two case-specific participation deposits. Both parties must accept the issued terms before receipts can be recorded. Financial terms cannot be edited after issue.

| Outcome | Treatment |
| --- | --- |
| Successful sale | Each party's participation deposit is credited against their own service charge. Additional service payments cover the balance. Any excess is refundable. |
| Neither party at fault | Refund all received deposits and unused service payments to their original parties. No service charge is retained. |
| Buyer defaults | Return the seller's own deposit and unused service payments; award the seller half of the buyer's received deposit. AuctionHouse keeps the other half. Return the buyer's unused service payments. |
| Seller defaults | Return the buyer's own deposit and unused service payments; award the buyer half of the seller's received deposit. AuctionHouse keeps the other half. Return the seller's unused service payments. |

“Returned fully” is implemented for cancellation without fault. Successful-sale treatment retains the original instruction to credit the deposit towards service charges. Only money actually received is allocated; unpaid deposits do not create invented cash balances. Odd paisa in the default split goes to AuctionHouse. Percentage charges round half up to the nearest paisa.

Example: on a PKR 10,000,000 sale at 1% per party, each service charge is PKR 100,000. A PKR 30,000 deposit leaves PKR 70,000 in additional service charges per party. If the buyer defaults instead, the seller gets their own PKR 30,000 back plus PKR 15,000 compensation; AuctionHouse retains PKR 15,000. On a no-fault cancellation, each party gets PKR 30,000 back.

## Enable your administrator account

1. Register your own ordinary account and complete its profile.
2. While logged in to the website, open `/api/auth/me` in another tab on the same hostname. Copy your own `user.id` value. This ID is not your Google client ID or your email address.
3. In Cloudflare, open **Workers & Pages → auctionhouse → Settings → Variables and Secrets**. Add a **Secret** named `ADMIN_ACCOUNT_IDS`, with your account ID as its value. Separate multiple administrator account IDs with commas. Do not replace the encryption key.
4. Reload the website. **My account → Admin deal desk** opens `/admin`.

Only the operator-controlled account-ID allowlist grants administration. Registration/profile form fields cannot grant it. Removing an ID removes admin access on subsequent API requests. For local development, put the allowlist in ignored `source/.dev.vars` alongside the existing local encryption key.

## Manual release while CI/CD is set aside

From a VS Code PowerShell terminal:

```powershell
cd source
npm.cmd ci
npm.cmd run typecheck
npm.cmd run build
node scripts/test-accounts.mjs
npm.cmd run test:deals
npm.cmd run deploy:package
cd ../deployment
npm.cmd ci
npm.cmd run login
npm.cmd run database
npm.cmd run deploy
```

`npm run database` applies `0001_deal_management.sql` after the original account migration. Existing account tables and records are retained. It adds deal, cash receipt, settlement, payout and audit tables plus database constraints/triggers. Source packaging copies all SQL migrations to the deployment folder.

Keep `PII_ENCRYPTION_KEY` unchanged. Configure `ADMIN_ACCOUNT_IDS` on the Worker as above. The source and prebuilt folders are separate; rebuilding/packaging is required before deploying the prebuilt folder. This release has not run a remote migration or deployment.

## Operating a deal

1. Search **People** and **Interests** in the admin overview. Searches return up to 100 recent matching records. Both participants need complete profiles.
2. Select **Create a deal**. Set a clear property/file reference, agreed price, buyer/seller, both rates, both deposits, and deal-specific terms. The standard financial policy is attached automatically. Review carefully: issued financial terms stay fixed.
3. Each party opens **My account → My deals**, reviews the price, rates, deposits and complete terms, then accepts them. An administrator cannot accept on their behalf.
4. After receiving cash, use **Record a received payment**, select the party and purpose, enter the amount and a globally unique paper receipt number. Partial deposits are allowed up to the agreed amount. Repeated submission of an identical receipt does not double count it. Cash receipts are records of cash actually received, not collection requests.
5. An incorrect receipt may be voided, with a reason, before activation. The original remains visible; its amount no longer counts. Issue a new receipt reference for the corrected entry.
6. Activate only after both acceptances and both full deposits. Record any remaining service charges after activation. The database rejects overpayments and invalid state changes even when requests overlap.
7. Once the sale has completed and service charges are covered, enter the sale/evidence reference and confirm completion. The app creates the final allocation, with deposits credited and excess shown as refundable.
8. For a withdrawal or cancellation, choose **Hold for review** first. Receipts freeze. Review evidence, notify both parties, then select buyer default, seller default or no-fault cancellation and confirm the allocation preview. This decision is final in this release; disputed deals are not reopened or silently edited.
9. Use **Record a completed payout** only after the beneficiary actually receives cash or an external bank transfer. Unique references and database limits prevent paying the recorded entitlement twice. A settlement decision alone never marks a refund paid. The website does not send bank transfers.

Customers can see their own deals and receipts; administrators can see both sides and the activity trail. CNIC and address data remain outside the admin lists. All writes use the existing session and origin protections; administrative decisions and receipts are audited in the same database batch as the change.

## PayFast Pakistan preparation

Chosen provider: **PayFast Pakistan (`gopayfast.com`)**, currency **PKR**. There is no merchant account yet. Card collection is explicitly unavailable in this release; no customer is shown a fake checkout or marked paid from a browser redirect. Cash collection and external payout recording work independently.

Next actions for onboarding:

1. Apply through [PayFast Pakistan](https://gopayfast.com/). Explain that these are conditional property-deal participation deposits, with potential forfeiture and compensation to the other party. Obtain written confirmation that this model and the expected transaction sizes are supported.
2. Request the merchant **Hosted Checkout** integration pack, sandbox account, transaction-status verification specification, signed server callback specification, and refund/partial-refund process. Confirm how chargebacks and beneficiary compensation are handled.
3. Put merchant credentials in Cloudflare Worker secrets when issued, not in GitHub source, browser code, or chat. Reserved integration names are `PAYFAST_MERCHANT_ID` and `PAYFAST_SECURED_KEY`; they are not consumed by the application yet. Adding them alone does not enable card payments.
4. The next implementation should create server-side payment attempts tied to a deal, party, purpose, exact PKR amount and unique basket ID. Use the provider-hosted card page, verify server callbacks/status independently, compare amount/currency/order, and credit the receipt once. Redirect query parameters are not evidence of payment.
5. Test successful, failed, pending, duplicate, expired and late callbacks; card/cash races; refunds; and chargebacks before enabling live payments. A late successful card payment after a deal freezes must enter reconciliation, not bypass the settlement limits.

PayFast's public [API reference](https://gopayfast.com/docs/) documents merchant credentials, transaction status and refund facilities. Its [hosted checkout example](https://gopayfast.com/wp-content/uploads/google-pay-developer-doc.pdf) describes a separate redirect integration. Obtain the current merchant-specific contract before mixing these interfaces. No live credentials, card numbers or CVVs are stored here.

## Suggested next improvements, in order

1. **Verified inventory:** replace demo listing cards with seller-submitted files/properties, ownership-document review, admin approval and clear listing status. The current marketplace still shows demos and does not run real auctions.
2. **Written transaction terms:** define the default evidence, notice period, appeal process, no-fault cancellation and service-charge basis. Have local counsel and your accountant review forfeiture, taxes and invoices before real-money operation. The website implements your rule; it does not establish legal enforceability.
3. **Money reconciliation:** separate held deposits from earned fees, match cash/bank/gateway statements, issue printable invoices/receipts, and show net revenue after processing costs and refunds. Current overview cash totals include held deposits and are not revenue.
4. **Admin protection:** add MFA/Cloudflare Access and separate cashier, reviewer and owner permissions, with a second approver for default decisions and large payouts. The current allowlist grants full admin authority.
5. **Notifications and deadlines:** send transactional notices for issued terms, consent, deposits, deadlines, decisions and refunds; add a customer-visible support/dispute thread and evidence uploads with private access.
6. **Operational controls:** database backup/recovery drills, monitoring and error alerts, pagination/exports, retention rules, email verification and account abuse controls. Changes to a table involved in custom SQL triggers must preserve/recreate those triggers during future SQLite table rebuilds.

Automated coverage: `npm run test:deals` uses an isolated temporary D1 instance and synthetic accounts. It tests authorization, customer isolation, CSRF, money arithmetic, consent, receipt caps/idempotency, successful-sale credits, no-fault refunds, both default directions, payout limits and immutable history. It does not call PayFast or move real money.
