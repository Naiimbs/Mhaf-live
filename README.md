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

## Run locally

### Requirements

- Node.js compatible with the project scripts
- npm
- Optional services for full functionality: PostgreSQL, a LiveKit server, and SMTP/email configuration

### Setup

```bash
git clone https://github.com/NaiimBS/Mhaf-live.git
cd Mhaf-live
npm install
cp .env.example .env.local
```

Review `.env.local` and replace every placeholder with suitable local values. Never use production credentials in local development or commit secret values. The example file documents the available settings; features that depend on LiveKit, email delivery, or deployment-specific services require those services to be configured.

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

## License

No open-source license is currently provided. Unless a license is added, the source is publicly viewable but reuse and redistribution are not granted by default.
