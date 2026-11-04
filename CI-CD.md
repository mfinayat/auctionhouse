# GitHub Actions setup

Upload this entire project with `source/`, `deployment/`, and `.github/` at the repository root. The production branch is `main`; change both branch conditions and the push filter in `.github/workflows/ci-cd.yml` if you use a different branch name.

## One-time GitHub and Cloudflare setup

1. Create a GitHub repository. From this project's root, run:

   ```sh
   git init -b main
   git add .
   git commit -m "Set up AuctionHouse with GitHub Actions"
   git remote add origin https://github.com/YOUR-OWNER/YOUR-REPOSITORY.git
   ```

2. In GitHub, open **Settings > Environments**, create `production`, and restrict deployment branches to `main`. Add required reviewers there if you want approval before each production deployment.
3. Create a Cloudflare API token using the **Edit Cloudflare Workers** template, restricted to the account holding `auctionhouse` and `auctionhouse-db`. Include **Account > D1 > Edit** so the workflow can apply migrations. Keep any account-read permissions required by Wrangler from that template. This configuration has no zone routes; custom domains remain managed in the dashboard.
4. In the GitHub `production` environment, add these secrets:

   | Secret | Value |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | The scoped API token |
   | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (not the D1 database ID) |

5. Confirm `source/wrangler.jsonc` points at your Worker and D1 database. Source configuration is authoritative: packaging regenerates `deployment/wrangler.json`. Commit future configuration changes in source.
6. Keep `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, and the existing `PII_ENCRYPTION_KEY` in Cloudflare Worker secrets. CI preserves an existing encryption key and initializes one only when missing. It never rotates the key. `EMAIL_FROM` and `SITE_ORIGIN` are ordinary variables in source configuration. Set up Google callbacks and your verified email sender as described in `README-FIRST.md`.
7. Run `git push -u origin main`. Monitor **Actions > CI and Cloudflare deployment**.

Cloudflare's authentication instructions: [GitHub Actions for Workers](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).

## What runs

Every pull request, push to `main`, and manual run installs locked source dependencies, checks TypeScript, builds the application, runs account regression checks against an isolated local database, creates a fresh deployment package, and validates it with Wrangler's dry run. Pull requests have no production credentials.

After successful checks on `main`, the deployment job downloads that run's checked package, installs its locked Wrangler dependency, applies pending remote D1 migrations, preserves or initializes the encryption key, and deploys Worker code and assets. Production jobs are serialized and running deployments are not canceled. GitHub may replace older pending jobs with newer pending jobs. Manual runs from other branches perform checks only.

The workflow uses Node 22.22.0 because the existing regression script uses `node:module` synchronous registration hooks. GitHub's Node workflow guidance: [Building and testing Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs).

In repository branch protection/rulesets, require the **Build and check** status before merging into `main`. Disable a separate Cloudflare Workers Builds integration for this same Worker if configured, to avoid two independent deployment pipelines.

## Editing and recovery

Edit and commit `source/`; CI rebuilds it instead of deploying the checked-in prebuilt website. You do not need to regenerate the prebuilt folders locally for CI. Changes to only `deployment/wrangler.json` are overwritten during packaging.

Append SQL migrations in `source/drizzle/`; do not edit previously applied migrations. Keep migrations compatible with the currently deployed application because they run before the new code. A migration failure stops deployment. A later deployment failure leaves successful database migrations applied; reverting code does not revert database changes.

To retry a transient failure, rerun the failed workflow. To deploy a code rollback, revert the relevant source commit on `main` and push it; account for any migrations already applied. Workflow logs and the seven-day deployment artifact identify the checked commit.

The workflow does not attach custom domains or create your GitHub repository, Cloudflare account, or D1 database. Those resources must exist. Never commit Google OAuth client JSON files or provider keys; the root ignore rules exclude common local secret files.
