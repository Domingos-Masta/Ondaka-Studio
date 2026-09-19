// src/app/core/services/timing.service.ts
import { Injectable } from '@angular/core';

export interface TimingResult {
  wordCount: number;
  estimatedSec: number;
  wordBudget: number;
  deltaSec: number;
  deltaWords: number;
}

@Injectable({ providedIn: 'root' })
export class TimingService {

  countWords(html: string): number {
    if (!html) return 0;
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/[^\w\s'-]/g, ' ');
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  estimateDuration(html: string, wpm: number, pauseSec = 0): number {
    const words = this.countWords(html);
    return Math.round((words / Math.max(wpm, 60)) * 60 + pauseSec);
  }

  wordsForDuration(durationSec: number, wpm: number, pauseSec = 0): number {
    const speakingSec = Math.max(0, durationSec - pauseSec);
    return Math.round((speakingSec / 60) * wpm);
  }

  analyze(html: string, targetSec: number, wpm: number, pauseSec: number): TimingResult {
    const wordCount   = this.countWords(html);
    const estimatedSec = this.estimateDuration(html, wpm, pauseSec);
    const wordBudget   = this.wordsForDuration(targetSec, wpm, pauseSec);
    const deltaSec     = estimatedSec - targetSec;
    const deltaWords   = wordCount - wordBudget;
    return { wordCount, estimatedSec, wordBudget, deltaSec, deltaWords };
  }

  achievedWpm(wordCount: number, recordedSec: number): number {
    return recordedSec > 0 ? Math.round((wordCount / recordedSec) * 60) : 0;
  }

  formatTime(totalSec: number): string {
    const s = Math.max(0, Math.round(totalSec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const base = `${m}:${String(sec).padStart(2, '0')}`;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : base;
  }

  toTimecode(totalSec: number, fps = 25): string {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    const f = Math.floor((totalSec % 1) * fps);
    return [h, m, s, f].map(n => String(n).padStart(2, '0')).join(':');
  }
}