# MHAF Live

**Scheduling and real-time video meetings in one workspace.**

MHAF Live is an early-stage product project exploring a simpler way for independent professionals and teams to manage availability, bookings, and online meetings. Hosts organize conversations from a workspace; guests can book a time or join through a shared meeting link.

<p align="center">
  <a href="https://meet.naiimbsili.com/">Visit the live product</a>
  ·
  <a href="https://github.com/NaiimBS/Mhaf-live/tree/master/docs">Read the project documentation</a>
</p>

> **Project status:** actively developed prototype. The live website is a product preview, not a statement that every advertised or planned capability is production-ready. This repository is currently private and available only to authorized collaborators.

## At a glance

| | |
|---|---|
| Product | Calendar, bookings, and video meetings for professionals |
| Application | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, Radix UI |
| Video | LiveKit WebRTC |
| Data access | Prisma is included, but active bookings and meetings currently use a JSON store |
| User interface languages | English and French |
| Live product | [meet.naiimbsili.com](https://meet.naiimbsili.com/) |

## Product overview

MHAF Live is built around a host workspace and a separate guest journey. Hosts can manage availability and events, review bookings and meetings, and start or join video rooms. Guests can use a shared link to reach a booking flow or meeting room without managing a host workspace.

### Implemented in the codebase

- Host registration and sign-in flows.
- A host workspace with a weekly calendar, availability, bookings, and meeting management.
- Public booking routes with server-side validation and time-zone-aware slot handling.
- Manual scheduled meetings and instant meetings as distinct meeting records.
- Guest room access and a LiveKit-powered video-room client.
- Server-side LiveKit token issuance and meeting access checks.
- English and French interface translations.

The exact behavior depends on configuration. Email delivery requires a mail service, and real video calls require a reachable LiveKit deployment with matching credentials.

### Not available yet

The following are planned or under development, not released capabilities: attendance analytics and heatmaps, meeting recording or archival, transcription, AI summaries, and action-item generation. The public website may show prototypes or roadmap concepts; sample slots and previews are not connected to a live host calendar unless explicitly stated.

## Architecture and important limitations

The application uses Next.js App Router for the public site, host workspace, API routes, and room experience. LiveKit handles media connectivity. Room access tokens are created on the server; the LiveKit signing secret is not sent to the browser.

**Bookings and meetings currently persist to a local JSON file:** `data/mhaf_live_db.json`. An in-process lock protects selected mutations within one Node.js process. This does **not** provide distributed transactions, cross-process coordination, or multi-replica booking guarantees. Prisma and PostgreSQL are present in the repository, but PostgreSQL is not currently the authoritative store for the active booking and meeting flows.

Treat the project as a prototype until persistence, release operations, and production security have been reviewed and hardened. See the [current architecture](docs/architecture.md), [active data model](docs/data-model.md), and [implementation roadmap](docs/implementation-roadmap.md) for detail.

## Quick start

### Prerequisites

- Node.js 22 or later
- npm
- GitHub access to this private repository

LiveKit and SMTP credentials are optional for starting the application, but required to exercise real video calls and email-dependent flows. PostgreSQL is not the active persistence layer for bookings and meetings in the current codebase.

### Install and run

```bash
git clone https://github.com/NaiimBS/Mhaf-live.git
cd Mhaf-live
npm ci
cp .env.example .env.local
```

Review `.env.local` before starting the app. Replace local placeholders as needed and generate a unique development secret rather than reusing a production secret:

```bash
openssl rand -base64 32
```

Use the generated value for `NEXTAUTH_SECRET`. Keep `.env.local` private; never commit it or place production credentials in a local development environment. The example file documents additional settings for LiveKit, SMTP, storage, and deployment-specific integrations. Features that depend on those services will not work until they are configured.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Local application data is written under `data/`; do not place real customer or meeting data in development fixtures.

## Development commands

```bash
npm run dev         # Start the local development server
npm run test:unit   # Run unit tests
npm run test:e2e    # Run Playwright end-to-end tests
npm run build       # Create a production build
npm run start       # Serve a previously built application
```

End-to-end tests may require local services and environment variables. A successful local build or test run does not prove production readiness, production infrastructure availability, or multi-process booking safety. See the test configuration and project docs for environment-specific details.

## Documentation

- [Documentation index](docs/README.md)
- [Architecture and trust boundaries](docs/architecture.md)
- [Active data model and persistence limits](docs/data-model.md)
- [Implementation status and roadmap](docs/implementation-roadmap.md)
- [Product and UX direction](docs/product-direction-draft.md)
- [Landing-page specification](docs/landing-page-spec.md)
- [Deployment guide](docs/deploy-vps.md)
- [Backup and restore runbook](docs/backup-restore.md)

Deployment is a separate, manually reviewed release process. A normal push to `master` does not itself deploy the app; consult the deployment guide before attempting a release.

## Contributing

MHAF Live is currently a private project. Contributions are limited to collaborators who have been granted repository access.

1. Create a focused branch from `master`, for example `fix/booking-timezone` or `feat/calendar-export`.
2. Keep changes scoped and update documentation when behavior, configuration, or known limitations change.
3. Add or update tests for behavior changes. Run `npm run test:unit` and `npm run build`; run `npm run test:e2e` for affected user journeys when the required services are available.
4. Open a pull request with a concise summary, test results, screenshots for UI changes, and migration or configuration notes where relevant.

Do not include credentials, real meeting links, personal data, or production database content in commits, screenshots, fixtures, or pull requests. Do not present roadmap items as implemented features. If the repository later opens to outside contributions, update this section with the public issue, review, and community guidelines.

## Security

Never commit `.env.local`, API keys, signing secrets, SMTP credentials, customer information, or production data. If you identify a security issue, do not publish exploit details in a public issue. Contact the project maintainer privately so the issue can be reviewed responsibly.

## License and reuse

No open-source license is currently provided. Access to this private repository does not grant permission to copy, modify, or redistribute its source code. Licensing and contribution terms should be clarified before the repository is made public.
