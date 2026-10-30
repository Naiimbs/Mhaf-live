import assert from "node:assert/strict";
import test from "node:test";
import { getLiveKitLifecycleUpdate } from "../../src/lib/livekit/webhook.ts";

test("maps a verified participant join to a room join", () => {
  assert.deepEqual(
    getLiveKitLifecycleUpdate({
      id: "evt_join_1",
      event: "participant_joined",
      room: { name: "room-1", numParticipants: 1 },
    }),
    { eventId: "evt_join_1", roomUid: "room-1", action: "JOIN" }
  );
});

test("only treats the final participant leaving as a room leave", () => {
  assert.equal(
    getLiveKitLifecycleUpdate({
      id: "evt_leave_1",
      event: "participant_left",
      room: { name: "room-1", numParticipants: 1 },
    }),
    null
  );
  assert.deepEqual(
    getLiveKitLifecycleUpdate({
      id: "evt_leave_2",
      event: "participant_left",
      room: { name: "room-1", numParticipants: 0 },
    }),
    { eventId: "evt_leave_2", roomUid: "room-1", action: "LEAVE" }
  );
});

test("maps room-finished events to room leave and ignores incomplete events", () => {
  assert.deepEqual(
    getLiveKitLifecycleUpdate({
      id: "evt_finished_1",
      event: "room_finished",
      room: { name: "room-1" },
    }),
    { eventId: "evt_finished_1", roomUid: "room-1", action: "LEAVE" }
  );
  assert.equal(getLiveKitLifecycleUpdate({ id: "evt_missing_room", event: "participant_joined" }), null);
  assert.equal(getLiveKitLifecycleUpdate({ event: "participant_joined", room: { name: "room-1" } }), null);
});
