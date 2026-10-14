# Prime Cut Studios — Client collaborators and talent actions

## Source

Reconstructed from the user-provided `primecuts-source-live-73cd804(1).zip`.
Compared package.json, workspace-request.ts, rest-response.ts and workspace-policy.ts with source files exposed by the most recent identified production deployment in Vercel. No production build or complete bytewise deployment comparison was available.

## Changes made

1. `lib/workspace-db.ts`: connect private server operations to the Supabase RPCs `pc_invite_project_collaborator`, `pc_assign_project_talent`, and `pc_revoke_project_talent`. These RPCs were applied to the Prime Cut Studios database in the prior repair session. Do not rerun a migration for them without checking DB state first.
2. `app/api/team/members/route.ts`: return a compact JSON success to fetch forms while preserving traditional 303 navigation for other clients. The inviter retains original client-email separation and role validation.
3. `app/api/team/talent/route.ts`: same JSON success; explicitly report when a revocation finds no active selection; role and consent checks stay enforced.
4. `components/workspace/WorkspaceForm.tsx`: request a JSON success response, verify it, and navigate to the returned same-origin path without mistaking a failed redirected GET for a failed write. Keep user entries on genuine errors.
5. `scripts/test-team-access-actions.cjs`: synthetic isolated route tests (no production credentials or writes).

## Checked

- The archive source opens without CRC errors and has no unsafe traversal paths.
- `node scripts/test-team-access-actions.cjs` passed seven authorization and response tests.
- `node scripts/test-workspace-routes.cjs` passed ten route tests.
- `node scripts/test-rest-responses.cjs` passed eight regression checks.
- Changed TS and TSX files parsed without syntax errors.

## Not completed

- No deployment was made. Existing live website buttons remain unchanged until this source is deployed.
- No browser E2E test with authenticated production/staging accounts was performed.
- No full `npm ci`, `tsc --noEmit`, or Next.js build was performed in the offline reconstruction environment.
- Before releasing, use the matching Vercel project/environment and compare source and runtime config; run a full production build and authenticated invite/talent tests. Do not replace the live website with an older GitHub branch.
