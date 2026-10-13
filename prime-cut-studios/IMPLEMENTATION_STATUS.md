# Prime Cut Studios v0.3 — Implementation status (2026-10-12 Central Time)

## Verified on Supabase BBHUB
- Existing BBHUB project restored from INACTIVE to ACTIVE_HEALTHY; no new Supabase project created.
- Migration `primecuts_private_persistent_storage_20261013` successfully applied.
- Five `pc_` tables verified with row-level security enabled.
- Private bucket `primecuts-portfolio` verified, max 4 MiB.
- No customer test rows added.
- `SUPABASE_URL` configured on the Vercel `prime-cut-studio` project.

## Code changes staged here, NOT deployed to Vercel
- Replaced SQLite persistence with server-side Supabase REST calls for inquiries, quotes/projects, private portals, deliverables and portfolio.
- Removed filesystem writes and switched portfolio media to private Supabase Storage.
- Customer access tokens remain SHA-256 hashes in database; never saved as plaintext.
- Adjusted route handlers to await network queries.

## Not completed
- `SUPABASE_SECRET_KEY` must be set privately on Vercel. Connector cannot retrieve Supabase secret keys.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` must be configured by owner. Admin routes fail closed without them.
- Node packages cannot be downloaded in this workspace (network DNS restriction), so complete Next.js `npm run build` and live round-trip tests are not yet verified.
- Vercel deployment was deliberately NOT attempted. Pushing to GitHub main would auto-trigger multiple Vercel projects; do not push v0.3 until a safe deployment plan is approved.
- Stripe payments, client legal contracts, email alerts, Google Drive permissions, live calendar are still pending.
