# OPERATIONS DATABASE PREVIEW — NOT APPLIED

## How to activate in one controlled release

Run exactly the migration **supabase/planned/20261013_operations_casting_rentals_NOT_APPLIED.sql** with Supabase Migration API in the selected BBHUB project, then run security and login tests before deploying. Do not apply the older earlier foundation plan together with this file: it has overlapping but incompatible table definitions. Keep the existing v0.4 tables intact.

### Critical safety
- Do not create any staff invites before private permissions have been tested.
- Staff roles are derived only from the database and rechecked per request.
- owner authentication remains the existing Vercel admin login and is not transferable by invite.
- Public casting applicants never get private list access; data retention and guardian releases are required before accepting minors.
- Equipment records come from the Drive asset tracker; ready=operational, not rentable. External rentals require owner approval, rate and actual reservation validation.
- Reference images require verified manufacturer product photo URL or licensed file uploaded with consent. No unsupported hero images may be silently substituted.
- Financial figures and equipment serial numbers must never appear in public responses.
