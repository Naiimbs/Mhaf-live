"use client";

export interface RecorderState {
  isRecording: boolean;
  durationSeconds: number;
  formattedDuration: string;
}

export interface RecorderOptions {
  videoBitrate?: number; // default: 650_000 (650 kbps) - gives ~95MB for 20 min with high text clarity
  audioBitrate?: number; // default: 64_000 (64 kbps Opus) - clear voices
  frameRate?: number;    // default: 15 fps - optimal for meetings & presentations
}

export class MeetingRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private timerInterval: any = null;
  private startTime: number = 0;
  private onStateChange: (state: RecorderState) => void;
  private combinedStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;

  constructor(onStateChange: (state: RecorderState) => void) {
    this.onStateChange = onStateChange;
  }

  public getSupportedMimeType(): string {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return "video/webm";
  }

  public async startRecording(
    videoSourceElement?: HTMLVideoElement | null,
    extraAudioStreams?: MediaStream[],
    options?: RecorderOptions
  ): Promise<boolean> {
    try {
      if (typeof window === "undefined" || !navigator.mediaDevices) {
        throw new Error("Recording is not supported in this environment.");
      }

      const frameRate = options?.frameRate ?? 15;
      let videoStream: MediaStream;

      // If a video element is playing (e.g. active screen share or main stage)
      if (videoSourceElement && (videoSourceElement as any).captureStream) {
        videoStream = (videoSourceElement as any).captureStream(frameRate);
      } else {
        // Fallback: prompt presenter to select screen/tab to record
        videoStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: frameRate, max: 20 },
          },
          audio: true,
        });
      }

      // Mix Audio from all available streams
      const audioTracks: MediaStreamTrack[] = [];

      // 1. Tracks from videoStream if any
      videoStream.getAudioTracks().forEach((t) => audioTracks.push(t));

      // 2. Extra audio streams (local mic & remote participants)
      if (extraAudioStreams && extraAudioStreams.length > 0) {
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            this.audioContext = new AudioCtx();
            const destination = this.audioContext.createMediaStreamDestination();

            extraAudioStreams.forEach((stream) => {
              if (stream.getAudioTracks().length > 0 && this.audioContext) {
                const source = this.audioContext.createMediaStreamSource(stream);
                source.connect(destination);
              }
            });

            destination.stream.getAudioTracks().forEach((t) => audioTracks.push(t));
          }
        } catch (audioMixErr) {
          console.warn("[MeetingRecorder] Audio mix fallback:", audioMixErr);
        }
      }

      // Combine video tracks + audio tracks
      this.combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioTracks,
      ]);

      const mimeType = this.getSupportedMimeType();
      this.recordedChunks = [];

      const videoBitsPerSecond = options?.videoBitrate ?? 650_000;
      const audioBitsPerSecond = options?.audioBitrate ?? 64_000;

      try {
        this.mediaRecorder = new MediaRecorder(this.combinedStream, {
          mimeType,
          videoBitsPerSecond,
          audioBitsPerSecond,
        });
      } catch {
        this.mediaRecorder = new MediaRecorder(this.combinedStream, { mimeType });
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // Listen for video track end (e.g. user stops sharing)
      videoStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
          this.stopRecording("meeting-recording");
        }
      });

      this.mediaRecorder.start(1000); // chunk every 1 second
      this.startTime = Date.now();

      this.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
        const secs = String(elapsed % 60).padStart(2, "0");
        this.onStateChange({
          isRecording: true,
          durationSeconds: elapsed,
          formattedDuration: `${mins}:${secs}`,
        });
      }, 1000);

      this.onStateChange({
        isRecording: true,
        durationSeconds: 0,
        formattedDuration: "00:00",
      });

      return true;
    } catch (err) {
      console.error("[MeetingRecorder] Start error:", err);
      return false;
    }
  }

  public stopRecording(filenamePrefix: string = "meet-meeting"): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.onstop = () => {
        try {
          const mimeType = this.getSupportedMimeType();
          const ext = mimeType.includes("mp4") ? "mp4" : "webm";
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
          a.download = `${filenamePrefix}-${timestamp}.${ext}`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 1000);
        } catch (downloadErr) {
          console.error("[MeetingRecorder] Download error:", downloadErr);
        }
      };

      this.mediaRecorder.stop();
    }

    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach((t) => t.stop());
      this.combinedStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.onStateChange({
      isRecording: false,
      durationSeconds: 0,
      formattedDuration: "00:00",
    });
  }
}
