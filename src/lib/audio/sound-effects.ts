// Web Audio API Synthesizer for in-room meeting events
// Zero external files, zero latency, works 100% offline and in all browsers.

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

export function isSoundEffectsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem("mhaf_sound_fx");
  if (stored !== null) {
    soundEnabled = stored === "true";
  }
  return soundEnabled;
}

export function setSoundEffectsEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof window !== "undefined") {
    localStorage.setItem("mhaf_sound_fx", enabled ? "true" : "false");
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", gainLevel = 0.15, delay = 0) {
  if (!isSoundEffectsEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch {
    // AudioContext might be blocked until user gesture
  }
}

// 1. Participant joined room (soft cheerful 2-tone chime)
export function playUserJoinSound() {
  playTone(523.25, 0.15, "sine", 0.12, 0); // C5
  playTone(659.25, 0.25, "sine", 0.12, 0.1); // E5
  playTone(783.99, 0.35, "sine", 0.1, 0.2); // G5
}

// 2. Participant left room (soft descending chime)
export function playUserLeaveSound() {
  playTone(783.99, 0.15, "sine", 0.1, 0); // G5
  playTone(659.25, 0.18, "sine", 0.1, 0.1); // E5
  playTone(523.25, 0.25, "sine", 0.08, 0.2); // C5
}

// 3. Screen share started
export function playScreenShareStartSound() {
  playTone(440, 0.12, "sine", 0.12, 0); // A4
  playTone(554.37, 0.14, "sine", 0.12, 0.08); // C#5
  playTone(659.25, 0.25, "sine", 0.14, 0.16); // E5
}

// 4. Screen share stopped
export function playScreenShareStopSound() {
  playTone(659.25, 0.12, "sine", 0.1, 0); // E5
  playTone(554.37, 0.14, "sine", 0.1, 0.08); // C#5
  playTone(440, 0.2, "sine", 0.08, 0.16); // A4
}

// 5. In-meeting chat message sent
export function playMessageSentSound() {
  playTone(880, 0.08, "triangle", 0.08, 0);
  playTone(1174.66, 0.1, "sine", 0.08, 0.05);
}

// 6. In-meeting chat message received
export function playMessageReceivedSound() {
  playTone(659.25, 0.1, "sine", 0.12, 0);
  playTone(880, 0.2, "sine", 0.14, 0.08);
}

// 7. Mic toggle (mute / unmute)
export function playToggleMuteSound(isMuted: boolean) {
  if (isMuted) {
    playTone(320, 0.06, "square", 0.05, 0);
    playTone(220, 0.08, "square", 0.05, 0.04);
  } else {
    playTone(260, 0.06, "sine", 0.06, 0);
    playTone(392, 0.09, "sine", 0.06, 0.04);
  }
}
