# MHAF Live — Implementation Status and Next Steps

**Documentation status:** reflects the calendar and meeting implementation currently in the repository.
**Production deployment:** a release is a separate step and requires review and verification of environment settings and secrets.

## Verified repository status

| Area | Status in this codebase | Verification / limitation |
|---|---|---|
| Next.js application and authentication pages | Implemented | Production build succeeds. |
| Public landing page | Informational page; does not create rooms or bookings | Targeted Playwright coverage. |
| Public bookings | Server validation and IANA time-zone conversion | Targeted tests; JSON persistence, not distributed transactions. |
| Host weekly calendar | Implemented on `/dashboard`; aggregates bookings and meetings | Workspace test; displays the host time zone and out-of-range events by default. |
| Manual and instant meetings | Implemented as distinct `Meeting` records | Authenticated routes and conflicts protected within one process. |
| LiveKit video room | Client and server token issuance are present | Targeted route/unit and E2E tests; runtime requires configured credentials and a LiveKit service. |
| Scheduled-meeting access control | Enforced on the server | GET and POST tests confirm a client parameter cannot disable it. |
| Time zones | IANA-based conversion and daylight-saving transition handling | Five unit tests pass. |
| Booking/meeting persistence | Active JSON file (`data/mhaf_live_db.json`) | Single-process limitation; Prisma is not the source of truth for these flows. |
| Attendance webhooks/analytics, recording, transcripts, and AI summaries | Not implemented in this codebase | Do not advertise as available features. |

## Local checks recorded

- `npm run build` — succeeded.
- `node --experimental-strip-types --test tests/unit/timezone.test.ts` — 5 tests passed.
- Targeted Playwright suite — 23 tests passed across the landing page, calendar workspace, authentication, bookings, in-process conflict handling, and rooms.
- E2E tests used a fresh local database and SMTP redirected to localhost. No tests targeted a production database.

These checks do not establish slot uniqueness across multiple processes/replicas or production LiveKit availability.

## Proposed roadmap before public launch

The items below are proposals, not delivered features. P0 items are prerequisites if external users can create accounts, book slots, or hold real meetings. Acceptance criteria describe how to verify completion.

### P0 — Reliability, security, and trust

- **Transactional booking and meeting persistence.** Migrate the active JSON store to PostgreSQL with uniqueness constraints and transactions; preserve IDs and existing links with an idempotent import. *Acceptance:* two concurrent requests for the same slot cannot both succeed, including across instances; migration, backup, and restore are tested.
- **Abuse limits and public-flow hardening.** Review rate limits and error responses for registration, sign-in, magic links, demo requests, and booking; add proportionate bot protection if needed. *Acceptance:* automated tests cover limits and token expiry, and sensitive information is not leaked in responses or logs.
- **Personal-data lifecycle.** Document collected data, retention periods, and processing providers; provide an account/data deletion process and a way to handle deletion requests. *Acceptance:* user flows and privacy policy match actual behavior; deletion tests cover related records and retention exceptions.
- **Accessibility of essential flows.** Audit registration, calendar, booking, pre-join, and room flows with keyboard and screen-reader use; address contrast, labels, visible focus, and `prefers-reduced-motion`. *Acceptance:* core flows work without a mouse, and blocking WCAG 2.2 AA issues are fixed or documented with rationale.
- **Operational readiness.** Add useful health checks, logging that avoids secrets and unnecessary personal data, alerts for critical errors, and backup/restore and rollback procedures. *Acceptance:* restore is rehearsed in a test environment and the release process is repeated on staging before production.
- **End-to-end production verification.** Validate domains, HTTPS, session cookies, secrets, SMTP, LiveKit, slots, invitations, and access controls in production-like staging. *Acceptance:* checklist completed, smoke tests pass, and no demo keys or test data are exposed.

### P1 — More complete host and guest journeys

- **Calendar invitations.** Generate `.ics` invitations for booking confirmations and changes, with explicit time-zone information and the correct meeting link. *Acceptance:* events are checked in at least two calendar clients and daylight-saving transitions are tested.
- **Self-service cancellation and rescheduling.** Let guests confirm or request booking changes without exposing other guests' bookings; keep statuses, email, and availability aligned after each change. *Acceptance:* management tokens are limited or revocable, expiry is tested, and cancellation does not leave phantom slots.
- **Network recovery.** Make connection, camera/microphone permission, reconnection, and LiveKit failure states understandable; allow recovery without accidentally creating a duplicate meeting. *Acceptance:* manual and automated tests cover denied permissions, network loss, and reconnect.
- **Public preview that matches capabilities.** Clearly distinguish available features, prototypes, and planned work; offer a demo without real data only if it can be safely isolated. *Acceptance:* sample slots are never presented as real availability and preview actions cannot write to production data.
- **Account preferences.** Add host-managed time zone, language, and notification preferences. *Acceptance:* preferences persist across sessions and display consistently in the calendar, email, and invitations.

### P2 — Improvements after stabilization

- **Meeting history and attendance.** Build only from signed and persisted LiveKit events, with explicit retention rules.
- **Recording, transcription, and summaries.** Start only after selecting a provider and testing clear participant consent, visible recording indicators, access controls, deletion, and retention policy.
- **Calendar integrations and usage insights.** Evaluate external calendar synchronization and analytics after persistence, consent, and user needs are established.

## Recommended release steps

1. Review the pull request and settle remaining content decisions, including whether to keep a “Request a demo” CTA.
2. The hard-coded SMTP fallback was removed, and the mailbox password previously exposed in repository history was rotated with the provider on October 28, 2026. Install the new `SMTP_PASS` in the VPS environment, verify SMTP settings, and test delivery before production.
3. Confirm LiveKit, SMTP, public URL, and meeting-window settings in the target environment without publishing their values.
4. Decide whether deployment remains strictly single-process or migrate bookings/meetings to a transactional database before adding replicas.
5. Run staging smoke tests with non-sensitive data, then follow the release and rollback procedure in `deploy-vps.md`.

## Further work

- Migrate the JSON store to PostgreSQL with an idempotent import, invitation-link compatibility strategy, and transactional booking.
- Add signed LiveKit webhooks and a session/participant model before building attendance analytics.
- Add archival, transcription, or AI summaries only after choosing a provider and configuring storage, consent, retention, and end-to-end tests.
- Maintain tests for time-zone edge cases, cancellations, conflicts, host permissions, and historical UID compatibility.
