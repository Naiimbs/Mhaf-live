# MHAF Live — Landing Page Content Draft

**Status:** Product direction implemented on `feat/calendar-workspace-flow`; copy and final review remain open.
**Prepared:** 27 October 2026
**Current site language:** English
**Scope:** Copy proposal retained for review. Production has not been changed by this branch.

> The approved scope moves the public landing page toward product information and makes the host workspace the place to create meetings. The copy below avoids claims that have not been verified. The implementation is in the feature branch; this document remains a draft for wording and unresolved content choices.

## 1. Page purpose

Explain MHAF Live as a calendar, booking, and video-meeting workspace. Help visitors understand the three ways a host can arrange a meeting, then direct hosts to create an account or sign in. The public landing page does not create a meeting, room, booking, or invite.

## 2. Navigation

- Brand: **MHAF Live**
- In-page link: **How it works**
- In-page link: **For hosts**
- Secondary action: **Sign in** → `/login`
- Primary action: **Create your account** → `/register`
- **Request a demo** is not included in this implementation; revisit only if the product owner wants the separate contact/lead flow promoted.

Do not put **Start Instant Meeting**, **Create Room**, or a real booking widget in the public navigation or mobile sticky CTA.

## 3. Proposed page outline and copy

### Hero

**Eyebrow**
A clearer way to schedule and meet

**Headline**
Bookings and video meetings, in one calendar.

**Supporting copy**
Manage your availability, share a booking link, schedule a meeting directly, or start an instant call — all from your host workspace.

**Primary CTA**
Create your account

**Secondary CTA**
Sign in

**Small supporting line**
Guests book through a separate link. You control the times that are available.

**Visual direction**
Show a static illustration of a weekly calendar with a booked appointment and two meetings. It is a product illustration only: no live room, no selectable slot, no microphone prompt, and no write request.

### Section: One calendar, three ways to meet

**Card 1 — Let guests book a time**
Share a booking link for a meeting type. Guests choose from the times you make available, and confirmed bookings appear in your calendar.

**Card 2 — Schedule a meeting directly**
Add a meeting to your calendar without publishing a booking page. Share the meeting link with the people you invite.

**Card 3 — Start an instant meeting**
Open a meeting room from your host workspace and share its link when you need to meet now.

Keep the distinction clear: the first option creates a booking; the second and third create meetings without a guest booking flow.

### Section: Your schedule, your rules

**Headline**
Set your availability once. Keep your calendar in control.

**Copy**
Choose your working hours and time zone, then share booking links only when you are ready. Your calendar brings bookings and scheduled meetings together in one place.

Avoid promising perfect time-zone handling or zero double-booking until the production persistence layer enforces and verifies those guarantees across all deployed processes.

### Section: How it works

1. **Set up your workspace** — Create an account and set your time zone.
2. **Choose how you meet** — Share a booking link, schedule a meeting, or start one instantly from the calendar.
3. **Meet from one place** — Review upcoming bookings and meetings in your calendar, then open the room at the right time.

### Closing CTA

**Headline**
Make your calendar the place where meetings begin.

**Copy**
Set up your host workspace and choose the way you want people to meet with you.

**Buttons**
Create your account · Sign in

## 4. Claims to remove or hold back until verified

Do not repeat marketing claims about transcription, action items, attendance heatmaps, automatic recording, compliance certifications, guaranteed privacy properties, or low-latency performance as live product capabilities unless they are implemented, configured, and verified on the deployed service.

Also avoid:

- “Zero double-booking risk” until conflict prevention is enforced atomically across the actual production storage layer and tested under concurrency.
- “ACID active” while the core booking path uses file-based JSON rather than database transactions.
- Claims that a room is live simply because the page has switched to the meeting UI.
- Pricing tiers or enterprise features unless the product owner has approved the offer and the underlying features exist.

## 5. Calls to action and route boundaries

| Visitor action | Destination | What must happen |
|---|---|---|
| Create an account | `/register` | Registration only; no meeting or booking is created. |
| Sign in | `/login` | Opens the host workspace; the default after login is the weekly calendar. |
| Book a host's time | A separately shared `/book/[hostSlug]/[eventSlug]` link | Guest chooses a time on the host-specific page, not on the product landing page. |
| Join a meeting | A meeting invitation `/rooms/[slug]` | Opened from a meeting link; it is not a public landing-page CTA. |

## 6. Language and visual notes

The copy is drafted in English because the current public site is English. Localization into Arabic/French is a separate product decision. Keep the visual style aligned with the existing MHAF Live brand, while making the calendar the central product image.

## 7. Review checklist

- Is “Bookings and video meetings, in one calendar” the right positioning?
- Should a separate **Request a demo** CTA be promoted, or should the two account CTAs remain the only public actions?
- Are the three ways to meet described correctly?
- Should the public page remain English for the first version?

---

**Implementation boundary:** The proposal has been implemented on `feat/calendar-workspace-flow`; it has not been merged or deployed to production.
