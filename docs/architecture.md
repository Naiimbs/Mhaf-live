# MHAF Live — System Architecture & Trust Boundary Specification

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Architectural Blueprint:** Next.js App Router + LiveKit Media Engine + PostgreSQL + Async AI Pipeline  

---

## 1. System Topology & Architectural Concerns

MHAF Live decouples real-time media streaming, web application workflows, relational data persistence, and AI speech intelligence into **distinct architectural tiers**. This prevents media processing bottlenecks from impacting web responsiveness and keeps private meeting tokens strictly guarded.

```mermaid
flowchart TB
    subgraph ClientTier ["1. Client Tier (Browser / Edge)"]
        Landing["Public Landing Page & Demo Modal"]
        Booking["Public Booking Portal (/[host]/[slug])"]
        Dashboard["Authenticated Host Dashboard"]
        MeetingClient["Embedded LiveKit Room Client"]
    end

    subgraph AppServerTier ["2. Application Server Tier (Next.js App Router)"]
        AuthService["Auth & Session Manager (NextAuth / JWT)"]
        SchedulingService["Availability & Slot Booking Engine"]
        TokenMinter["LiveKit AccessToken Minter (/api/connection-details)"]
        WebhookReceiverService["LiveKit Webhook Verifier (/api/livekit/webhook)"]
        APIRoutes["REST / Server Actions API Layer"]
    end

    subgraph MediaEngineTier ["3. Media Engine Tier (LiveKit SFU)"]
        LiveKitSFU["LiveKit Server / Cloud (WebRTC SFU)"]
        EgressWorker["LiveKit Egress Service (Audio/Video Archival)"]
    end

    subgraph DataTier ["4. Database & Persistence Tier"]
        Postgres[(PostgreSQL Database)]
        PrismaORM["Prisma Client ORM"]
        ObjectStorage[("S3-Compatible Storage (Recordings & Exports)")]
    end

    subgraph AIServiceTier ["5. Async Intelligence & Worker Tier"]
        STTWorker["Speech-to-Text Engine (Whisper / Deepgram)"]
        Summarizer["LLM Intelligence & Action Item Extractor"]
    end

    %% Client Interactions
    Landing --> APIRoutes
    Booking --> SchedulingService
    Dashboard --> APIRoutes
    MeetingClient <-->|WebRTC Media & Data| LiveKitSFU
    MeetingClient -->|Request Signed Token| TokenMinter

    %% App Server Interactions
    TokenMinter -->|Signs JWT with API Secret| MeetingClient
    APIRoutes --> PrismaORM
    SchedulingService --> PrismaORM
    PrismaORM --> Postgres

    %% LiveKit Server & Webhooks
    LiveKitSFU -->|Signed Lifecycle Webhooks| WebhookReceiverService
    WebhookReceiverService -->|Log Join/Leave/Session| PrismaORM
    LiveKitSFU -->|Triggers Recording| EgressWorker
    EgressWorker -->|Persists MP4/M4A| ObjectStorage

    %% AI Pipeline
    ObjectStorage -.->|Audio Payload| STTWorker
    STTWorker -->|Speaker Diarized Text| Summarizer
    Summarizer -->|Summary & Action Items| PrismaORM
```

---

## 2. Trust Boundaries & Security Architecture

### 2.1 The Token Minting Boundary (`/api/connection-details`)
* **Security Threat:** If client browsers could mint their own room tokens, a malicious user could grant themselves host privileges, kick legitimate hosts, or snoop on private meetings.
* **Architecture Rule:**
  1. Client sends room identifier and requested identity to Next.js server.
  2. Server verifies session / booking authorization against PostgreSQL:
     - Is the caller the registered Host? $\rightarrow$ Grant `roomAdmin: true`, `canPublish: true`, `canSubscribe: true`.
     - Is the caller a recognized guest or invitee? $\rightarrow$ Grant `roomAdmin: false`, `canPublish: true`, `canSubscribe: true`.
     - Is the room locked? $\rightarrow$ Reject minting request with `403 Forbidden`.
  3. Server signs a short-lived JSON Web Token (JWT) using `LIVEKIT_API_SECRET` via `livekit-server-sdk`.
  4. The client receives only the temporary token and connects directly to the LiveKit SFU.

```mermaid
sequenceDiagram
    autonumber
    actor Participant as Attendee / Host Browser
    participant NextServer as Next.js API (/api/connection-details)
    participant Database as PostgreSQL (Prisma)
    participant SFU as LiveKit Media SFU

    Participant->>NextServer: GET /api/connection-details?room=eng-sync
    NextServer->>Database: Query meeting room status & permissions
    Database-->>NextServer: Room Active, User Role: Host
    NextServer->>NextServer: Construct AccessToken with Grants (roomJoin, roomAdmin)
    NextServer->>NextServer: Sign JWT using LIVEKIT_API_SECRET
    NextServer-->>Participant: Return { serverUrl, participantToken, roomName }
    Participant->>SFU: Connect WebRTC via Token
    SFU->>SFU: Validate Token Signature & Grants
    SFU-->>Participant: Connection Established (Peer Connection Open)
```

### 2.2 The Webhook Ingestion Boundary (`/api/livekit/webhook`)
* **Security Threat:** Forged HTTP POST requests claiming participants joined or left could corrupt attendance records.
* **Architecture Rule:**
  - Incoming requests to `/api/livekit/webhook` are validated using `WebhookReceiver` from `livekit-server-sdk`.
  - The `Authorization` header contains a signature validating the SHA-256 hash of the payload against `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.
  - Unsigned or invalid requests are dropped immediately with `401 Unauthorized`.

---

## 3. Core Workflow Architectures

### 3.1 Real-Time Meeting Room Flow (LiveKit Reference)
1. **Pre-Join Screen:**
   - Reads local media devices (`navigator.mediaDevices.enumerateDevices`).
   - Renders live video preview element (`<video>`).
   - Runs Web Audio API analyzer to display microphone input level meters.
   - User sets device preferences and display name.
2. **Room Connection & State Machine:**
   - Transitions through states: `Disconnected` $\rightarrow$ `Connecting` $\rightarrow$ `Connected` $\rightarrow$ `Reconnecting` $\rightarrow$ `Disconnected`.
   - On connection, automatically publishes selected tracks (Mic, Camera).
3. **In-Meeting Media Controls:**
   - Microphone mute/unmute (`track.mute()` / `track.unmute()`).
   - Camera enable/disable.
   - Screen Share (`room.localParticipant.setScreenShareEnabled(true)`).
   - In-room chat: Sent over LiveKit reliable WebRTC data channels (`room.localParticipant.publishData()`), eliminating external WebSocket overhead.
4. **Host Moderation Privileges:**
   - Host can mute remote participants, remove/kick participants via `RoomServiceClient` on the backend, or lock the room to prevent additional token redemptions.

### 3.2 Scheduling & Booking Flow (Cal.diy Reference)
1. **Availability Definition:**
   - Host configures working hours (e.g., Monday–Friday, 09:00–17:00 UTC) and timezone.
   - Host defines buffer times (e.g., 10 minutes between meetings) and minimum notice periods (e.g., 2 hours).
2. **Slot Generation Engine:**
   - Client requests available slots for a date range: `GET /api/schedule/slots?eventSlug=30min&date=2026-10-30`.
   - Engine queries existing `Booking` records for that host within the window.
   - Generates prospective time slots, filters out conflicting bookings, and normalizes slots to the attendee's detected timezone.
3. **Atomic Booking Reservation:**
   - Attendee selects slot and submits name, email, and notes.
   - Database executes transaction:
     ```sql
     -- Atomic slot lock preventing double-booking
     INSERT INTO "Booking" (id, host_id, start_time, end_time, status)
     VALUES (...);
     ```
   - Automatically generates a paired `MeetingRoom` record with a unique URL slug (`/rooms/mhaf-[uuid]`).
   - Dispatches transactional confirmation emails to both Host and Attendee with calendar `.ics` attachments.

### 3.3 Attendance Analytics & Heatmap Flow
1. **Event Capture:**
   - When a participant enters or leaves, LiveKit SFU fires `participant_joined` and `participant_left` webhooks.
   - The backend records discrete `ParticipantEvent` logs in PostgreSQL:
     - `session_id`, `participant_identity`, `participant_name`, `event_type`, `timestamp`.
2. **Session Reconciliation:**
   - On `room_finished`, the system aggregates all events for that session:
     - Calculates each participant's `join_time`, `leave_time`, `net_duration_seconds`.
     - Identifies mid-call dropouts and reconnections.
3. **Heatmap & Timeline Projection:**
   - Maps participant presence onto 60-second time bins across the total meeting duration.
   - Yields a visual density matrix:
     - Green: Active audio/video presence.
     - Yellow: Muted / passive presence.
     - Red/Empty: Dropped out or absent.

### 3.4 Speech-to-Text & Meeting Summary Flow
* **Verification Note:** LiveKit standard webhooks do not transport speech or text.
* **Verified Production Architecture:**
  1. **Option A (Post-Meeting Asynchronous Processing - Default Recommended):**
     - Host triggers or enables auto-recording.
     - LiveKit Egress streams composite audio (`.m4a`) directly to S3 storage upon room completion.
     - LiveKit sends `egress_ended` webhook with the resulting S3 storage key.
     - Background queue worker pulls the audio file and feeds it to an STT worker (OpenAI Whisper or Deepgram) for diarized speech recognition (identifying speaker identity per timeline chunk).
     - Diarized text is passed to an LLM to generate:
       - Executive Summary
       - Key Discussion Topics
       - Structured Action Items with assignees.
  2. **Option B (Real-Time In-Meeting Streaming - Future Upgrade):**
     - A LiveKit Voice Agent / STT bot joins the room as a subscriber and publishes real-time transcript chunks over the `lk.transcription` data topic directly to participants' UIs.

---

## 4. Environment Variables Specification

```env
# ==========================================
# 1. Web Application & Security
# ==========================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=super_secret_jwt_random_key_min_32_characters

# ==========================================
# 2. Database (PostgreSQL)
# ==========================================
DATABASE_URL=postgresql://mhaf_user:mhaf_secure_password@localhost:5432/mhaf_live?schema=public

# ==========================================
# 3. LiveKit Real-Time Media Engine
# ==========================================
LIVEKIT_URL=wss://mhaf-live.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://mhaf-live.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxx
LIVEKIT_API_SECRET=secretxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ==========================================
# 4. Storage & Recording Egress (S3 Compatible)
# ==========================================
S3_BUCKET_NAME=mhaf-live-recordings
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true

# ==========================================
# 5. Transactional Email & Notifications
# ==========================================
EMAIL_FROM="MHAF Live <notifications@mhaf.live>"
RESEND_API_KEY=re_xxxxxxxxxxxxxx

# ==========================================
# 6. AI & Transcription Engine
# ==========================================
TRANSCRIPTION_PROVIDER=deepgram # or whisper-local
DEEPGRAM_API_KEY=dg_xxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

---

## 5. Observability, Deployment & Error Handling

### Connection State & Disconnect Handling
1. **Network Flickers:** The LiveKit client SDK handles ICE restarts and WebRTC reconnects automatically up to 15 seconds without resetting session state.
2. **Reconnection Recovery:** If a client reconnects, the existing participant session in PostgreSQL is updated with a `RECONNECTED` event, avoiding duplicate attendee counts.
3. **Session Heartbeat:** If a host abruptly closes their browser without clicking "End Meeting", the room automatically terminates after `empty_timeout` (default 300 seconds), triggering the `room_finished` cleanup sequence.

### Logging & Auditing
* **Database Audit Logs:** All sensitive actions (deleting rooms, minting host tokens, downloading recordings, viewing transcripts) generate immutable records in the `AuditLog` table.
* **Server Health:** Structured JSON logging on Next.js server actions and route handlers.
