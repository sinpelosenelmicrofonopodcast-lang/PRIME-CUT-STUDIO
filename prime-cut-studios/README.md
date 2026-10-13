# Prime Cut Studios — PrimeCuts OS v0.3 (Supabase Edition)

Official Prime Cut Studios website and business operations code. **No deployment has been requested or run for v0.3.**

## Persistent production storage
- Supabase BBHUB project `mvrszgunjwvdqogtpyqm` (`https://mvrszgunjwvdqogtpyqm.supabase.co`)
- Five private, RLS-protected tables prefixed `pc_`
- Private Storage bucket `primecuts-portfolio` (only explicitly published/approved photos are served)
- Database read/write happens only on the server with the **Supabase secret key**; never use it in `NEXT_PUBLIC_*`.
- Admin username/password and session HMAC remain server-only and must be set by the owner before activation.
- No client/payment/contract/Drive automation is enabled yet. Do not represent form submissions as bookings.

## Deploy prerequisites — DO NOT TRIGGER AUTOMATIC DEPLOYMENTS
1. Get your project's `sb_secret_*` API key from [Supabase BBHUB / API Keys](https://supabase.com/dashboard/project/mvrszgunjwvdqogtpyqm/settings/api-keys).
2. In your Vercel project `prime-cut-studio`, set `SUPABASE_SECRET_KEY` as a **Sensitive** environment variable, for Production/Preview/Development (never paste the secret in chat or GitHub). `SUPABASE_URL` was already configured on Vercel.
3. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` as server-only env vars. These were provisioned privately in Vercel during integration setup; rotate the temporary password before production use. To generate a new password hash locally, run `read -rsp "New admin password: " PW; echo; printf "%s" "$PW" | node scripts/generate-admin-hash.cjs; unset PW`.
4. Verify Vercel Root Directory is `prime-cut-studios`; framework Next.js; install `npm install --no-audit --no-fund`; build `npm run build`.
5. Ensure that other Vercel projects connected to the same repository are not accidentally deployed. Existing root app is BDG and is not the Prime Cut Studios website.
6. Run install/build locally with network access and Node 24.x, then release only after checking the logs and core flows.

## How to run locally
```sh
cd prime-cut-studios
cp .env.example .env.local
# fill the private fields in .env.local, not in source control
npm install
npm run build
npm run dev
```

## Privacy and safety
- RLS is enabled; `anon` and `authenticated` do not receive direct access to business tables.
- Media is stored in a private bucket and streamed only when a database entry is published and consented.
- New media never publishes automatically; user must confirm permissions and click publish.
- Client portal links are random, stored hashed in the database, expire after 90 days, and can be regenerated.
- Editing quotations never collects money. Payments, e-signatures and booking calendars are not connected.
- Supabase REST calls use HTTPS and the secret key stays on the server.

## Implementation status
See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) and migration at `supabase/migrations/20261013030000_primecuts_persistent_storage.sql`.

Legacy v0.1 conceptual schema is archived in `supabase/reference/` and is not applied automatically.

## Safe GitHub integration branch

This code is tracked in `primecuts-supabase-integration-v03` in the existing `PRIME-CUT-STUDIO` GitHub repository. Root and nested `vercel.json` files disable automatic deployments on the integration branch only. Production `main` remains unchanged pending approval.
