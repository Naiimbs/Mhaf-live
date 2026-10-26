# MHAF Live — Landing Page Specification & UI/UX Design System

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Design Reference:** `shadcnstore/shadcn-dashboard-landing-template` (adapted for MHAF Live)  

---

## 1. Product Positioning & Value Proposition

**MHAF Live** is a high-assurance, real-time video conferencing, intelligent scheduling, and meeting intelligence platform built for modern professional teams, executive consultations, and privacy-first organizations.

### Core Value Pillars
1. **Frictionless Engagement:** Instant guest entry via secure meeting links without mandatory account creation.
2. **Deterministic Scheduling:** Multi-timezone availability calculation with zero double-booking risk (inspired by `cal.diy`).
3. **High-Fidelity Audio & Video:** Low-latency WebRTC powered by LiveKit SFU infrastructure.
4. **Actionable Meeting Intelligence:** Verifiable attendance logging, participant heatmaps, and post-call transcription summaries.
5. **Absolute Privacy:** End-to-end token validation, strict role isolation, and no client-side telemetry leakage.

---

## 2. Visual Language & Design System Tokens

MHAF Live follows a **monochrome-first, premium, high-density aesthetic** with warm neutral undertones and functional accents.

### Color Palette
```css
/* Light Mode */
--background: 0 0% 100%;           /* #FFFFFF */
--foreground: 240 10% 3.9%;        /* #09090B */
--card: 0 0% 99%;                  /* #FCFCFC */
--card-foreground: 240 10% 3.9%;
--popover: 0 0% 100%;
--popover-foreground: 240 10% 3.9%;
--primary: 240 5.9% 10%;           /* Deep Onyx #18181B */
--primary-foreground: 0 0% 98%;
--secondary: 240 4.8% 95.9%;       /* Soft Cool Grey #F4F4F5 */
--secondary-foreground: 240 5.9% 10%;
--muted: 240 4.8% 95.9%;
--muted-foreground: 240 3.8% 46.1%;/* Balanced Slate #71717A */
--accent: 240 4.8% 95.9%;
--accent-foreground: 240 5.9% 10%;
--border: 240 5.9% 90%;            /* Subtle Outline #E4E4E7 */
--ring: 240 5.9% 10%;

/* Dark Mode */
--background: 240 10% 3.9%;        /* Deep Obsidian #09090B */
--foreground: 0 0% 98%;            /* Pure Off-white #FAFAFA */
--card: 240 10% 5.5%;              /* Dark Surface #0E0E11 */
--card-foreground: 0 0% 98%;
--primary: 0 0% 98%;               /* Crisp White */
--primary-foreground: 240 5.9% 10%;
--secondary: 240 3.7% 15.9%;       /* #27272A */
--muted: 240 3.7% 15.9%;
--muted-foreground: 240 5% 64.9%;  /* #A1A1AA */
--border: 240 3.7% 15.9%;
--ring: 240 4.9% 83.9%;

/* Functional Semantic Accents */
--live-status-active: 142 76% 45%; /* Live Indicator Green #16A34A */
--media-recording: 0 84% 60%;      /* Recording Red #EF4444 */
--focus-ring: 240 5.9% 10%;
```

### Typography Hierarchy
* **Primary Typeface:** `Inter` or `Geist Sans` (high legibility at compact body sizes).
* **Headings:**
  * `H1 (Hero Title)`: 44px (Mobile) / 64px (Desktop), Weight: 700, Letter-spacing: -0.03em.
  * `H2 (Section Header)`: 32px (Mobile) / 40px (Desktop), Weight: 600, Letter-spacing: -0.02em.
  * `H3 (Card Title)`: 20px / 24px, Weight: 600.
* **Body:**
  * `Body Regular`: 15px / 24px line-height, Weight: 400.
  * `Body Small / Metadata`: 13px / 18px line-height, Weight: 500.
  * `Monospace / Code / Timestamps`: `Geist Mono` or `JetBrains Mono`, 12px.

---

## 3. Landing Page Structure & Section Hierarchy

The landing page is organized into 10 structured sections designed for maximum conversion and architectural clarity:

```
┌────────────────────────────────────────────────────────┐
│ 1. Announcement Pill Banner                            │
├────────────────────────────────────────────────────────┤
│ 2. Sticky Glass Header & Navigation                    │
├────────────────────────────────────────────────────────┤
│ 3. Hero Section (H1 + CTAs + Live Conference Mockup)   │
├────────────────────────────────────────────────────────┤
│ 4. Trust Matrix / Industry Security Badges             │
├────────────────────────────────────────────────────────┤
│ 5. Product Architecture Pillars (Bento Grid)           │
├────────────────────────────────────────────────────────┤
│ 6. Interactive Scheduling & Room Demo Widget           │
├────────────────────────────────────────────────────────┤
│ 7. Meeting Intelligence & Analytics Heatmap Preview    │
├────────────────────────────────────────────────────────┤
│ 8. Transparent Tier Comparison                         │
├────────────────────────────────────────────────────────┤
│ 9. Frequently Asked Questions (Accordion)              │
├────────────────────────────────────────────────────────┤
│ 10. High-Conversion Footer + Request Demo Modal        │
└────────────────────────────────────────────────────────┘
```

---

### Detailed Section Specifications

#### Section 1: Announcement Pill Banner
* **Visual:** Subtle top bar with border bottom.
* **Content:** `"Introducing MHAF Live v1.0 — WebRTC Media Engine with Verifiable Attendance Logging"` + `"Read Architecture Plan →"`.
* **Behavior:** Dismissible via local storage preference; hides on scroll if compact.

#### Section 2: Header / Navigation
* **Container:** Sticky top nav with `backdrop-blur-md bg-background/80` and `border-b border-border/40`.
* **Left:** MHAF Live Brand Mark (Monochrome Geometric Glyph + "MHAF LIVE" wordmark).
* **Center (Desktop):** Navigation links: `Platform`, `Scheduling`, `Room Engine`, `Security`, `Docs`.
* **Right:**
  * Theme Toggle (Dark / Light).
  * `Sign In` (Ghost button).
  * `Request Demo` / `Start Instant Meeting` (Primary Onyx pill button).
* **Mobile:** Hamburger menu triggering a sliding sheet (`Sheet` component) with touch targets $\ge 48\text{px}$.

#### Section 3: Hero Section & Product Visual
* **Header Composition:**
  * Eyebrow: `[WebRTC SFU + Autonomous Scheduling]`
  * Heading: **"Video meetings built for precision, privacy, and actionable intelligence."**
  * Subtext: `"Eliminate fragmented scheduling tools and bloated conferencing apps. MHAF Live brings ultra-low-latency video, zero-login guest entry, and automated post-meeting analytics together into a unified platform."`
* **CTA Cluster:**
  * Primary Button: `[ Create Instant Room ]` (Direct entry to PreJoin staging).
  * Secondary Button: `[ Request Enterprise Demo ]` (Opens structured dialog form).
* **Hero Visual Graphic:**
  * An interactive mock of the **MHAF Live Video Conference Room**.
  * Shows active video tiles with speaker status, live audio waveform visualizer, connected latency badge (`18ms · WebRTC SFU`), and a real-time transcript pill.

#### Section 4: Trust & Compliance Strip
* **Visual:** Grayscale emblem bar featuring:
  * `SOC-2 Type II Certified Principles`
  * `Zero Third-Party Telemetry`
  * `Self-Hostable Media SFU`
  * `GDPR & Multi-Region Data Residency`

#### Section 5: Feature Pillars (Bento Grid Layout)
1. **The Instant Meeting Room:** PreJoin staging, camera/mic preview, active speaker spotlight, screen sharing, and end-to-end token security.
2. **Autonomous Scheduling Engine:** Timezone-aware booking pages, automated calendar buffer intervals, and conflict prevention.
3. **Attendance Timeline & Heatmaps:** Granular participant join/leave events, net duration tracking, and engagement metrics.
4. **Verifiable Post-Meeting Intelligence:** Automatic audio egress processing, speaker-labeled transcripts, and structured action items.

#### Section 6: Interactive Room & Booking Preview
* Dual-tab interactive widget allowing visitors to toggle between:
  * **Tab A: Scheduling View:** Select event type (e.g. "30 Min Architecture Review"), view live interactive time slots, and preview the calendar booking confirmation.
  * **Tab B: Meeting Room Staging:** Test browser mic meter, switch input device dropdowns, and toggle camera preview.

#### Section 7: Analytics Heatmap Showcase
* Data visualization panel displaying:
  * Meeting session timeline.
  * Attendee attendance spans (e.g. Participant A joined at 00:00, left at 42:15; Participant B joined at 05:10).
  * Net retention rate and audio participation distribution chart.

#### Section 8: Tier Comparison
* **Developer / Open Tier:** Self-hosted SFU, unlimited peer-to-peer rooms, core scheduling calendar.
* **Pro Tier:** Hosted LiveKit infrastructure, automated S3 cloud recordings, AI transcription summaries.
* **Enterprise:** Dedicated SFU clusters, custom domain masking, SAML/SSO integration, HIPAA BAA compliance.

#### Section 9: FAQ Accordion
* Accordion component built with Radix primitive:
  * *Do participants need an account to join a meeting?* (No, guests join securely via signed token).
  * *How is transcription handled?* (Audio is captured via LiveKit Egress and processed asynchronously via privacy-preserving STT workers).
  * *Can MHAF Live be self-hosted?* (Yes, backend runs on Next.js/PostgreSQL and media runs on open-source LiveKit SFU).

#### Section 10: Footer & Request-Demo Modal
* **Footer:** Comprehensive site links, Git repository link, security statement, copyright notice.
* **Request Demo Modal Dialog:**
  * Fields: Full Name, Work Email, Organization, Use Case (Dropdown: Enterprise, Healthcare, Legal, Developer), Expected Monthly Meeting Hours.
  * Validation: Zod schema with client and server validation.
  * Submission: Sends notification to admin queue and logs submission to PostgreSQL.

---

## 4. Mobile & Responsive Layout Rules

| Viewport | Breakpoint | Layout Adjustments |
| :--- | :--- | :--- |
| **Mobile** | `< 640px` | Stacked single column, full-width buttons, collapsible mobile drawer, sticky bottom CTA bar (`[ Start Meeting ]`). |
| **Tablet** | `640px - 1024px` | 2-column bento grids, collapsed navigation links into secondary menu, compact meeting preview. |
| **Desktop** | `> 1024px` | Full 3-column bento grid, rich interactive preview side-by-side with hero copy, persistent top nav. |

* **Touch Targets:** All interactive controls maintain minimum $44 \times 44\text{px}$ touch boundaries.
* **Accessibility (WCAG 2.1 AA):** All form controls include explicit `<label>` tags, high contrast ratios ($\ge 4.5:1$ for text), and keyboard `Tab` + `Esc` focus traps on modals.
