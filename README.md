# Prime Cut Studios

**Photography · Video Production · Creative Services — Central Texas**

This is the source repository for **Prime Cut Studios**. The Prime Cut Studios website and internal production-management platform are collectively known as **PrimeCuts OS**.

## Prime Cut Studios v0.2

The current project has been imported intact into the **[prime-cut-studios/](prime-cut-studios/)** directory.

- [Website and operations source](prime-cut-studios/)
- [Project README and setup instructions](prime-cut-studios/README.md)
- [Implementation status and remaining work](prime-cut-studios/IMPLEMENTATION_STATUS.md)

The standalone Next.js project lives in `prime-cut-studios/`, not at the repository root. Run its development commands from that directory. **There has been no deployment, and Vercel is not part of the requested workflow.**

## Existing root application (legacy)

The repository already contained a different Next.js app, identified in its code as **BDG SaaS Platform**. That application is preserved unchanged at the repository root to prevent loss of existing work. Its original README is archived in [docs/legacy-bdg-README.md](docs/legacy-bdg-README.md).

**Do not treat the root application as the Prime Cut Studios website.** Integrating or replacing it will require a separate reviewed change.

## Before publishing

Complete live service integrations, production authentication and database configuration, validate the full build and test the client-facing flows. Do not enable payment or rental workflows until configured and approved.
