# PrimeCuts OS v0.4 — Client account & review links

- Client invitation, password setup, email/password login, signed HttpOnly sessions, membership authorization, and logout added.
- Previous share-link project portal disabled; now requires authenticated project membership.
- Admin can create manually agreed projects and add private review links from Lightroom, DaVinci / Blackmagic Cloud, or Google Drive.
- Review links saved hidden and released explicitly by admin; external service permissions must also be set correctly.
- Migration added to Supabase: client accounts, memberships, expiring single-use invites, login throttling, deliverable provider.
- No automatic email delivery, Adobe API synchronization, or Blackmagic Cloud API synchronization.
- Deployment and full Next.js build verification need to be confirmed separately.
