export interface LiveKitLifecycleEvent {
  id?: string;
  event?: string;
  room?: {
    name?: string;
    numParticipants?: number;
  };
}

export interface LiveKitLifecycleUpdate {
  eventId: string;
  roomUid: string;
  action: "JOIN" | "LEAVE";
}

/**
 * Convert only authoritative lifecycle events into room state updates.
 * A participant-left event is considered a room leave only when LiveKit
 * reports that no participants remain in the room.
 */
export function getLiveKitLifecycleUpdate(
  event: LiveKitLifecycleEvent
): LiveKitLifecycleUpdate | null {
  if (!event.id || !event.room?.name) return null;

  if (event.event === "participant_joined") {
    return { eventId: event.id, roomUid: event.room.name, action: "JOIN" };
  }

  if (event.event === "participant_left" && event.room.numParticipants === 0) {
    return { eventId: event.id, roomUid: event.room.name, action: "LEAVE" };
  }

  if (event.event === "room_finished") {
    return { eventId: event.id, roomUid: event.room.name, action: "LEAVE" };
  }

  return null;
}