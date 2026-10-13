# Prime Cut Studios — Website & Production Operations

**Prime Cut Studios is the business brand. PrimeCuts OS is its operations software. Self-hosted, without Vercel.**

## Built in this release

- Responsive premium black/white/gold public website (home, services, portfolio, equipment policy, about, booking, privacy, booking information).
- Persistent inquiry submission with server-side validation, anti-spam honeypot, hourly per-IP-hash throttle; confirmation and error states.
- Private administrator login: password hashed with scrypt, HMAC-signed expiring HTTP-only cookie, origin checks, login attempt throttling; **no default credentials**.
- Live admin dashboard from private SQLite, inquiry -> project conversion and manual production statuses.
- Editable quote amounts/scope with printable draft proposal. **Not a final contract or payment request.**
- Private expiring client access links (90 days) and immediate link revocation on regeneration.
- Private project view with quote, status and staff-approved deliverables only.
- Drive link allowlist in admin; assets are private by default (Drive file sharing is managed separately).
- Approved-work-only portfolio upload and separate publish/unpublish control. Uploaded images stored in a private persistent media directory, served through a public endpoint only when published.
- SEO metadata, sitemap, robots, mobile menu, basic accessible input labels, privacy text and security headers.
- Rental availability is **NOT** assumed or offered. All internal gear remains internal.

## Technical notes

- Next.js 16.4.0 / React 19.2.6 / TypeScript / built-in Node SQLite.
- Recommended Node.js **24.15 or newer**. `node:sqlite` is experimental on the older Node 22 line.
- The application expects a *single persistent Node server* with a private writable disk. SQLite files and uploaded images **must not** live on an ephemeral/serverless filesystem.
- This release intentionally does not connect to an existing unrelated Supabase project. Legacy SQL migration is retained in `supabase/migrations/` as reference, not applied.

## Setup (local or own server)

1. Install Node.js 24.15+ and dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local`, set a unique `ADMIN_EMAIL`, a 32+ character `SESSION_SECRET`, and a hashed password:

   ```bash
   read -rsp "Admin password: " PW; echo
   printf "%s" "$PW" | node scripts/generate-admin-hash.cjs
   unset PW
   ```

   Put the script output in `ADMIN_PASSWORD_HASH`; **do not use your raw password in the file.**

3. Keep `PRIMECUTS_DB_PATH` and `PRIMECUTS_MEDIA_PATH` on a persistent disk outside public folders. Default: `./data/primecuts.sqlite` and `./data/portfolio/`.

4. Run and test locally:

   ```bash
   npm run dev
   npm run typecheck
   npm run build
   ```

5. Log in at `/admin/login`. Request forms go to `/book`. Submitted requests appear under `/admin`.

6. Before hosting, configure HTTPS and a real public domain. Set `NEXT_PUBLIC_SITE_URL` for canonical sitemaps, lock down network ingress and perform a full end-to-end test with a test submission. Use your own server or chosen host: **do not deploy to Vercel**.

## Regular operations and backup

- Back up the SQLite database (including write-ahead-log state, preferably via the SQLite backup API or `VACUUM INTO`) and the entire portfolio media directory. Test restores.
- Use a private persistent volume owned by the process user; do not commit the database, media or secrets to Git or Drive without encryption.
- Quote and client delivery links should be shared only after reviewing their content and Google Drive permissions.
- Revoke access by generating a new private link in `/admin`.
- Do not activate live rentals before inventory approval and insurance/condition workflows are implemented.

## Not yet connected — requires credentials / workflow decisions

- Real card payments, invoicing and reconciliation (payment processor not configured).
- Legally reviewed production contracts and e-signature workflow.
- Automated email/SMS confirmations, Google Calendar booking checks and automatic Google Drive folders/delivery permissions.
- Production-grade monitoring, backups, externally hosted uptime checks and domain/HTTPS.
- Approved original portfolio media; the gallery starts empty by design.
- Privacy/terms legal review and commercial price approval before public launch.

**Never treat a quote, project status, or submitted date as a confirmed paid booking.**

## Data privacy

Server data contains personal contact information. Access to `/admin` requires configured credentials. The public client portal uses unguessable access tokens stored in SHA-256 form, with expiry and revocation, but links must be protected by their holders. Always use HTTPS on a public host.

## Canonical Google Drive structure (reference only)

- Root: `02_PRIME CUT STUDIOS` — `<CONFIGURE_PRIVATE_DRIVE_FOLDER_ID>`
- Clients: `01_Clients` — `<CONFIGURE_PRIVATE_DRIVE_FOLDER_ID>`
- Delivery: `08_Delivery` — `<CONFIGURE_PRIVATE_DRIVE_FOLDER_ID>`
- Templates: `09_Templates` — `<CONFIGURE_PRIVATE_DRIVE_FOLDER_ID>`
