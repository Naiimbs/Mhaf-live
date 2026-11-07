# MHAF Live

**Scheduling and real-time video meetings in one workspace.**

MHAF Live is a personal software project exploring a simpler workflow for independent professionals and teams: hosts manage availability and meetings in one place, while guests can join a call through a shared link.

- **Live product:** [meet.naiimbsili.com](https://meet.naiimbsili.com/)
- **Status:** actively developed; prototype / early-stage project
- **Languages:** English and French
- **Stack:** Next.js, React, TypeScript, Tailwind CSS, LiveKit, Prisma

## What works today

The codebase includes host registration and sign-in, a host calendar workspace, booking and meeting flows, instant meetings, guest room access, and LiveKit-based video rooms. Server-side routes validate meeting access and issue LiveKit room tokens; the browser does not receive the LiveKit signing secret.

Some items visible on the product site are concepts or roadmap work, not released features. Attendance analytics, recording and archival, transcription, and AI summaries are not currently implemented. Scheduling persistence currently uses a local JSON store with a single-process concurrency lock. It is not suitable for multi-instance production writes without a transactional storage migration. See [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md) and [`docs/architecture.md`](docs/architecture.md) for verified scope and limitations.

## Quick start

### Requirements

- Node.js 22 or later
- npm
- LiveKit and SMTP/email credentials are only needed to exercise the corresponding real-time meeting and email flows.

### Setup

```bash
git clone https://github.com/NaiimBS/Mhaf-live.git
cd Mhaf-live
npm ci
cp .env.example .env.local
```

Review `.env.local` and replace only the settings needed for the feature you want to try. Never use production credentials in local development or commit secret values. Scheduling data currently uses the local JSON store; the Prisma schema does not make PostgreSQL the active source of truth for bookings and meetings.

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run test:unit
npm run test:e2e
npm run build
```

End-to-end tests may require the environment and local services described in the project documentation. A successful local build or test run does not establish production readiness or multi-process booking guarantees.

## Project documentation

- [`docs/architecture.md`](docs/architecture.md) — current routes, trust boundaries, persistence, and implemented scope
- [`docs/implementation-roadmap.md`](docs/implementation-roadmap.md) — verified status, checks, and work remaining before release
- [`docs/deploy-vps.md`](docs/deploy-vps.md) — deployment notes
- [`docs/backup-restore.md`](docs/backup-restore.md) — backup and restoration guidance

## Security

Do not commit `.env.local`, API keys, signing secrets, SMTP credentials, or customer data. If you discover a security issue, please do not publish exploit details in a public issue; contact the project maintainer privately.

## Contributing

MHAF Live is currently a private project, so contributions are limited to collaborators who have repository access. If you are an invited contributor:

1. Create a focused branch from `master`, using a descriptive name such as `fix/booking-timezone` or `feat/calendar-export`.
2. Keep the change aligned with the implemented scope. Update the relevant documentation when behavior, configuration, or limitations change.
3. Add or update tests for behavior changes. Run `npm run test:unit` and `npm run build`; run `npm run test:e2e` when the change affects a user flow and the required local services are configured.
4. Open a pull request with a short description, test results, screenshots for visible UI changes, and any migration or configuration notes.

Do not include credentials, real meeting links, personal data, or production database content in commits, screenshots, test fixtures, or pull requests. Please do not describe roadmap items as available features unless they have been implemented and verified. Once the repository is opened to outside contributions, this section should be updated with the preferred issue, review, and community guidelines.

## License

No open-source license is currently provided. Repository access does not grant permission to reuse, modify, or redistribute the source. The repository is private, and access is limited to authorized collaborators.
