# Prime Cut Studios – 2026 pricing & Name Your Budget release candidate

Source: `PrimeCut-portal-corregido.zip`, Oct 14, 2026. Its SHA1 fingerprints were verified to match the current production deployment for representative core files (app/page.tsx, app/globals.css and lib/data.ts). The site has NOT been deployed from this archive.

## Included

- 14 bilingual service categories, 50 scoped packages, 14 add-ons.
- Music-video **Gun N Run stays $500**, one camera, one operator, recording with basic editing and a two-hour/one-location cap.
- Public service comparison, English/Spanish toggle, per-package quote and Name Your Budget on every category and package.
- Direct links from services into booking, with preselected service + package or custom-budget mode.
- Flexible custom amount, including budgets under $500, with server-side validation; no automatic discount or booking.
- Existing Supabase inquiries retained; service, budget, package selection, language and extras saved in the existing fields; no migration.
- Existing email outbox reused for bilingual customer confirmation and owner intake notification; owner recipient is `PRIMECUTS_OWNER_INTAKE_EMAIL` if set, otherwise `admin@getbdg.com`. SMTP delivery requires the current configured mail transport.
- Existing internal notifications reused with an owner-only new-inquiry notification. Admin workflows, client access, casting, proposals, authentication and existing project records are not intentionally changed.

## QA performed

- All modified TS/TSX files passed TypeScript transpiler syntax parsing.
- All 14 category identifiers match active service choices.
- 50 unique priced packages including Gun N Run $500; 14 add-ons.
- Non-destructive change set; no schema changes.

## Remaining release validation

- Run `npm ci`, `npm run typecheck` and `npm run build` under Node >=24.15.0 in a network-enabled CI before deployment; this environment has Node 22 and unavailable npm registry dependencies.
- Test quote flow with package selection and custom-budget submission using an admin-controlled test lead; verify Supabase storage and both email recipient queues.
- Review costs and final terms/pricing before public release.
- Publish from this current source, not the older connected GitHub main branch. One Vercel production deployment after verification.
