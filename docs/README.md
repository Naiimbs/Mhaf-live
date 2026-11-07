# MHAF Live Documentation

This documentation distinguishes verified, implemented behavior from historical references and planned work. For the current architecture and data model, the running code under `src/` and the documents below take precedence over older design drafts.

- [`architecture.md`](architecture.md) — current routes, trust boundaries, persistence, and operational limits.
- [`data-model.md`](data-model.md) — entities used by the active JSON store and compatibility with existing bookings.
- [`landing-page-spec.md`](landing-page-spec.md) — public landing-page behavior and limits.
- [`implementation-roadmap.md`](implementation-roadmap.md) — verified status, local checks, and proposed release work.
- [`deploy-vps.md`](deploy-vps.md) and [`backup-restore.md`](backup-restore.md) — deployment and operations procedures; verify environment settings and backups before a release.
- [`product-direction-draft.md`](product-direction-draft.md) and [`landing-page-content-draft.md`](landing-page-content-draft.md) — product and copy direction retained for review.
- [`reference-audit.md`](reference-audit.md) — historical audit of reference projects, not a description of the current product.

## Important storage limitation

Active bookings and meetings are persisted in `data/mhaf_live_db.json`. The concurrency lock is in memory and coordinates mutations only within the same Node.js process. Do not treat the Prisma schema as proof that these operations use PostgreSQL, and do not deploy multiple writers without a transactional storage migration.
