import { Injectable, signal } from '@angular/core';

export interface RecordingResult {
  blob: Blob;
  durationSec: number;
}

@Injectable({ providedIn: 'root' })
export class RehearsalService {
  readonly isRecording = signal(false);
  readonly elapsedSec = signal(0);

  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private ticker?: ReturnType<typeof setInterval>;
  private stream?: MediaStream;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream, { mimeType: mime });
    this.recorder.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); };

    this.startedAt = performance.now();
    this.elapsedSec.set(0);
    this.isRecording.set(true);
    this.recorder.start(250);

    this.ticker = setInterval(() => {
      this.elapsedSec.set((performance.now() - this.startedAt) / 1000);
    }, 200);
  }

  async stop(): Promise<RecordingResult> {
    if (!this.recorder) throw new Error('Not recording');

    const result = await new Promise<RecordingResult>(resolve => {
      this.recorder!.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.recorder!.mimeType });
        resolve({ blob, durationSec: (performance.now() - this.startedAt) / 1000 });
      };
      this.recorder!.stop();
    });

    clearInterval(this.ticker);
    this.stream?.getTracks().forEach(t => t.stop());
    this.isRecording.set(false);
    this.recorder = undefined;
    this.stream = undefined;
    return result;
  }

  async persist(projectId: string, takeId: string, blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    return (window as any).api.saveTake({ projectId, takeId, buffer });
  }
}