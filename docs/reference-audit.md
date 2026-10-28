# MHAF Live — Open-Source Reference Audit & Dependency Analysis

**Document Status:** Historical source-reference audit; not a current implementation description
**Date:** October 2026
**Target Repository:** `Naiimbs/Mhaf-live`

> The baseline notes below describe the repository at the time of the original audit. They predate `feat/calendar-workspace-flow`; use `docs/architecture.md`, `docs/data-model.md`, and `docs/implementation-roadmap.md` for the current implementation and verification state.

---

## 1. Executive Summary

This reference audit provides an exhaustive evaluation of four selected open-source reference projects to establish the implementation blueprint for **MHAF Live**:
1. **Landing Page & UI Dashboard Starter:** `shadcnstore/shadcn-dashboard-landing-template`
2. **Real-Time Video Conferencing Implementation:** `livekit-examples/meet`
3. **Scheduling & Booking UX Architecture:** `calcom/cal.diy`
4. **Reverse Engineering & Binary Analysis Architecture:** `morluto/rea`

Rather than cloning or indiscriminately copying upstream repositories, this audit inspects each reference's exact license, dependency tree, environmental requirements, architectural boundaries, and reusability for MHAF Live.

---

## 2. Historical MHAF Live Baseline Inspection

* **Workspace path in the original audit:** `d:/naiimC/Mhaf-live`.
* **Repository state at that time:** Clean scaffold, before the scheduling and meeting workflows were added.
* **Historical baseline:** The claims about a pristine repository, absent framework, or zero legacy constraints are not current-state claims and must not guide present deployment decisions.

---

## 3. Deep Dive: Open-Source References

### Reference 1: `shadcnstore/shadcn-dashboard-landing-template`
* **Source URL:** [https://github.com/shadcnstore/shadcn-dashboard-landing-template](https://github.com/shadcnstore/shadcn-dashboard-landing-template)
* **License:** **MIT License** (Permissive; commercial and private use permitted with attribution).
* **Package Architecture:** Dual-engine structure:
  * `nextjs-version/` (Next.js 15/16 App Router, React 19, TypeScript)
  * `vite-version/` (Vite, React 19, SPA routing)
* **Core Dependencies:**
  * UI Foundation: `@radix-ui/react-*` / `@base-ui-components/react`, `shadcn/ui` CLI conventions
  * Styling: `tailwindcss` (v4 compatible), `tailwind-merge`, `clsx`, `class-variance-authority`
  * Icons: `lucide-react`
  * Charts: `recharts`
  * Text Editing: `@tiptap/react`
* **Environment Variables:** None strictly required for static UI; minimal `NEXT_PUBLIC_APP_URL`.
* **Reusability Classification:**
  * **Directly Reusable:** Landing page component primitives (Hero, FeatureTabs, BentoGrid, Testimonials, PricingTables, Accordion FAQs, MobileDrawer, ThemeProvider).
  * **Design Reference Only:** Mock data structures, static marketing text, placeholder dashboard layouts (Analytics, Mail, Chat).
  * **External Dependencies:** None required for baseline UI.

---

### Reference 2: `livekit-examples/meet`
* **Source URL:** [https://github.com/livekit-examples/meet](https://github.com/livekit-examples/meet)
* **License:** **Apache-2.0 License** (Permissive; allows modification, distribution, commercial use; requires notice and patent grant preservation).
* **Framework & Architecture:** Next.js App Router (`app/`), TypeScript.
* **Core Dependencies:**
  * Real-time Media SDK: `livekit-client` (WebRTC core)
  * UI Kit: `@livekit/components-react`, `@livekit/components-styles`
  * Backend Server SDK: `livekit-server-sdk`
* **Required Environment Variables:**
  ```env
  LIVEKIT_URL=wss://your-project.livekit.cloud # or self-hosted ws://localhost:7880
  LIVEKIT_API_KEY=APIxxxxxxxxx
  LIVEKIT_API_SECRET=secretxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
  ```
  *(Optional for Cloud Recording/Egress: `LIVEKIT_EGRESS_ENDPOINT`, S3 Bucket credentials).*
* **Core Application Flows:**
  1. **Pre-Join Screen (`PreJoin`):** Device selection (camera, microphone, speaker test), audio input meters, user display name entry.
  2. **Token Minting (`/api/connection-details`):** Server-side route handler uses `livekit-server-sdk` to generate an `AccessToken` with specific grants (`roomJoin`, `canPublish`, `canSubscribe`, `roomAdmin`).
  3. **Conference View (`<LiveKitRoom>` + `<VideoConference>`):** Manages participant tiles, screen sharing, speaker pin, chat sidebar, and control bar.
* **Reusability Classification:**
  * **Directly Reusable:** PreJoin staging workflow, LiveKit Room provider pattern, token minting backend handler, connection quality indicator, responsive grid layout.
  * **Design Reference Only:** Default `@livekit/components-styles` CSS (must be restyled to match MHAF Live's monochrome-first, high-precision aesthetic).
  * **External Dependencies:** LiveKit Server (LiveKit Cloud or self-hosted Dockerized LiveKit SFU instance).

---

### Reference 3: `calcom/cal.diy`
* **Source URL:** [https://github.com/calcom/cal.diy](https://github.com/calcom/cal.diy)
* **License:** **MIT License** (Fork of Cal.com stripped of proprietary/enterprise code; 100% open source).
* **Monorepo & Tech Stack:**
  * Architecture: Turborepo / Yarn workspaces (`apps/web`, `packages/prisma`, `packages/ui`, `packages/core`)
  * Framework: Next.js + tRPC (end-to-end type safety)
  * Database: PostgreSQL via Prisma ORM
  * Auth: NextAuth.js
* **Required Environment Variables:**
  ```env
  DATABASE_URL=postgresql://user:password@localhost:5432/mhaf_live
  NEXTAUTH_SECRET=long_random_string
  NEXTAUTH_URL=http://localhost:3000
  ```
* **Core Architectural Patterns:**
  * **Availability Algorithm:** Transforms weekly availability ranges, timezones, and booked slots into discrete, bookable time windows.
  * **Booking Conflict Detection:** Ensures atomic slot reservations with PostgreSQL transactions.
  * **Slug Routing:** `/[hostUsername]/[eventSlug]` generates dynamic public booking portals.
* **Reusability Classification:**
  * **Directly Reusable:** Availability interval calculation logic, timezone conversion math, slot reservation data model patterns.
  * **Design Reference Only:** Full Turborepo monorepo overhead (too heavy for MHAF Live initial scaffold; single Next.js project with modular folders is vastly cleaner).
  * **External Dependencies:** PostgreSQL database instance, SMTP server / Resend for booking notification emails.

---

### Reference 4: `morluto/rea` (Reverse Engineer Anything)
* **Source URL:** [https://github.com/morluto/rea](https://github.com/morluto/rea)
* **License:** **MIT License**
* **Role in Audit & Development:**
  * Model Context Protocol (MCP) server & CLI bridging AI agents to static analysis, JavaScript AST inspection, network capture, and runtime verification.
  * **Usage Boundary:** Per project rules, REA is deployed when inspecting compiled bundles, external client minified code, or verifying third-party package runtime exports. Normal open-source codebases with full repository source are audited directly using source analysis tools.

---

## 4. Reusability & Dependency Matrix

| Reference Module | Upstream Source | License | Reusability in MHAF Live | Target Layer | External Service Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Landing UI & Tokens** | `shadcn-dashboard-landing` | MIT | Component Primitives | Client UI / Marketing | None |
| **Theme & Dark Mode** | `shadcn-dashboard-landing` | MIT | Direct implementation | Client UI / Design System | None |
| **PreJoin Device Staging** | `livekit-examples/meet` | Apache-2.0 | Adapted to MHAF styling | Video Room Client | None (Browser WebRTC) |
| **Token Minting Handler** | `livekit-examples/meet` | Apache-2.0 | Direct API Route logic | Backend Route Handler | LiveKit API Key/Secret |
| **LiveKit Room Mesh** | `livekit-examples/meet` | Apache-2.0 | Integrated Component | Media Engine | LiveKit SFU (Cloud / Docker) |
| **Availability Math** | `cal.diy` | MIT | Adapted Utility Service | Core Backend Service | None |
| **Booking Calendar UI** | `cal.diy` | MIT | Adapted with shadcn/ui | Dashboard & Public Booking | PostgreSQL |
| **Database Schemas** | `cal.diy` + LiveKit | MIT / Custom | Synthesized Prisma Schema | Database Tier | PostgreSQL |

---

## 5. Verified Findings vs. Assumptions & Unknowns

### Verified Findings (Facts Established from Real Source Audits)
1. **LiveKit Webhook Boundary:** Standard LiveKit webhooks (`participant_joined`, `participant_left`, `room_finished`) fire reliably on room lifecycle changes and transmit participant identities and durations. However, **standard webhooks DO NOT stream live transcription text or chat messages**.
2. **Transcription Pipeline:** Real-time speech-to-text requires either:
   - A dedicated LiveKit Agent participant running STT (Whisper/Deepgram) publishing to an `lk.transcription` text topic, OR
   - Post-meeting transcription via LiveKit Egress exporting composite audio to S3, followed by an asynchronous transcription job.
3. **Licensing Compatibility:** Combining MIT (`shadcn-template`, `cal.diy`, `rea`) and Apache-2.0 (`livekit-examples/meet`) is legally permissive for proprietary or self-hosted distribution, provided standard copyright and license notices are retained.
4. **Client Trust Invalidation:** Client browsers must never be entrusted with room authorization, participant duration reporting, or admin privilege assignment. All grants must be server-signed via `livekit-server-sdk`.

### Assumptions (To be Confirmed in Implementation Phase)
1. **LiveKit Deployment Model:** Initial local development can run with LiveKit Cloud Free Tier or a local `livekit/livekit-server` Docker container before production cluster sizing.
2. **Audio Egress Storage:** Assumed S3-compatible storage (e.g. MinIO locally, Cloudflare R2 / AWS S3 in production) will be provisioned for session recordings.

### Unknowns (Requiring User Input Before Production Deployment)
1. Choice between **LiveKit Cloud managed infrastructure** vs. **Self-hosted LiveKit SFU Docker container**.
2. Preferred AI transcription engine provider (Deepgram API, OpenAI Whisper API, or local self-hosted Whisper worker).
3. Primary transactional email delivery provider (Resend, SendGrid, or standard SMTP).
