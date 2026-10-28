# MHAF Live — Landing Page Specification

**Status:** Implemented on `feat/calendar-workspace-flow`; pending review and deployment.
**Purpose:** Public product introduction only. The landing page does not create meetings, rooms, bookings, or invitations.

## Product positioning

MHAF Live is a host workspace for a booking calendar and video meetings. Hosts can share a booking page, schedule a meeting directly, or start an instant room from their authenticated calendar.

The public page explains those paths and sends hosts to sign in or create an account. Guests receive a host-specific booking URL or an invitation room URL separately.

## Page structure

1. **Sticky navigation:** MHAF Live brand, in-page links to How it works, Calendar, and Meetings; Sign in and Create your account actions. The mobile menu exposes the same links and actions.
2. **Hero:** “Plan the time. Meet when it matters.” Supporting copy describes bookings and video meetings in one workspace. The primary action goes to `/register`; the secondary goes to `/login`.
3. **Static calendar preview:** A non-interactive product illustration. It does not fetch slots, request device permissions, or send write requests.
4. **Workflow cards:** Explain booking a guest slot, scheduling directly without a booking, and creating an instant meeting from the host workspace.
5. **Closing call to action:** Direct hosts to create an account.
6. **Footer:** Short product description and account/how-it-works links.

## Route boundaries

| Visitor intent | Route | Boundary |
|---|---|---|
| Learn about MHAF Live | `/` | Read-only marketing content; no room launcher or live booking widget. |
| Create a host account | `/register` | Creates an account only. |
| Sign in | `/login` | Opens the authenticated host workspace. |
| Manage availability | `/dashboard/availability` | Host-only settings. |
| View calendar and create meetings | `/dashboard` | Host-only weekly calendar. |
| Book a host’s time | `/book/[hostSlug]/[eventSlug]` | Separate guest booking flow. |
| Join a meeting | `/rooms/[slug]` | Requires a persisted booking or meeting room; unknown UIDs are not auto-provisioned. |

## Claims and design constraints

- Do not claim recordings, transcription, AI summaries, attendance analytics, compliance certifications, or guaranteed latency; those capabilities are not verified as available in the current product.
- A static preview must remain clearly illustrative and have no controls that could be mistaken for a live booking or meeting.
- Keep the existing MHAF Live brand, theme support, responsive layout, visible focus states, and labeled navigation.
- The public landing page must not call any write API during page load or navigation.

## Acceptance checks

- Sign in links to `/login`; account creation links to `/register`.
- No Create Room, Start Instant Meeting, or public schedule-creation CTA appears.
- No booking, room, or lead is created by visiting the page.
- Static preview and landing page remain usable at mobile, tablet, and desktop widths without horizontal overflow.
