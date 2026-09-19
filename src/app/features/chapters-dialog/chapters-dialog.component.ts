// src/app/features/chapters-dialog/chapters-dialog.component.ts
import { Component, computed, inject, output } from '@angular/core';
import { ProjectStore } from '../../core/services/project/project.store';
import { TimingService } from '../../core/services/timing/timing.service';
import { ExportService } from '../../core/services/export/export.service';


interface ChapterRow {
  time: string;
  seconds: number;
  title: string;
  role: string;
  duration: number;
}

@Component({
  selector: 'app-chapters-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8"
         (click)="toClose.emit()">
      <div class="bg-surface-1 border border-surface-3 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
           (click)="$event.stopPropagation()">

        <header class="px-5 py-3 border-b border-surface-3 flex items-center">
          <h2 class="font-semibold text-sm uppercase tracking-wider text-zinc-400">
            YouTube Chapters
          </h2>
          <button class="ml-auto btn-ghost" (click)="toClose.emit()">Close</button>
        </header>

        @if (valid()) {
          <div class="px-5 py-2 bg-ok/10 text-ok text-xs border-b border-surface-3">
            ✓ Valid — YouTube requirements met (≥3 chapters, first at 0:00, each ≥10s).
          </div>
        } @else {
          <div class="px-5 py-2 bg-warn/10 text-warn text-xs border-b border-surface-3">
            ⚠ {{ invalidReason() }}
          </div>
        }

        <div class="flex-1 overflow-y-auto p-5">
          <table class="w-full text-sm">
            <thead class="text-xs text-zinc-500 uppercase tracking-wider">
              <tr>
                <th class="text-left py-2 w-24">Time</th>
                <th class="text-left py-2">Title</th>
                <th class="text-left py-2 w-24">Role</th>
                <th class="text-right py-2 w-20">Length</th>
              </tr>
            </thead>
            <tbody>
              @for (c of rows(); track c.seconds) {
                <tr class="border-t border-surface-3/50">
                  <td class="py-2 tabular-nums text-accent">{{ c.time }}</td>
                  <td class="py-2">{{ c.title }}</td>
                  <td class="py-2 text-xs text-zinc-500">{{ c.role }}</td>
                  <td class="py-2 text-right tabular-nums text-zinc-500">
                    {{ c.duration }}s
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="text-center text-zinc-600 py-8">
                  No scenes yet.
                </td></tr>
              }
            </tbody>
          </table>
        </div>

        <footer class="px-5 py-3 border-t border-surface-3 flex gap-2">
          <button class="btn-ghost" (click)="copy()">
            {{ copied() ? '✓ Copied' : 'Copy to clipboard' }}
          </button>
          <button class="btn-ghost ml-auto" (click)="download()">Save as .txt…</button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
  @reference "../../../styles.scss";
    .btn-ghost { @apply text-xs px-3 py-1.5 rounded-md text-zinc-300 hover:bg-surface-2 transition; }
  `],
})
export class ChaptersDialogComponent {
  readonly toClose = output<void>();

  private store = inject(ProjectStore);
  private timing = inject(TimingService);
  private exporter = inject(ExportService);

  copied = computed(() => this._copied());
  private _copied = (() => {
    // Tiny local signal — avoids another service for one boolean.
    const s = { v: false } as { v: boolean };
    return () => s.v;
  })();

  readonly rows = computed<ChapterRow[]>(() => {
    const out: ChapterRow[] = [];
    let t = 0;
    for (const s of this.store.scenes()) {
      const isIntro = s.role === 'hook' || s.role === 'intro';
      if (!isIntro) {
        const m = Math.floor(t / 60);
        const sec = String(t % 60).padStart(2, '0');
        out.push({
          time: `${m}:${sec}`,
          seconds: t,
          title: s.title,
          role: s.role,
          duration: s.targetDurationSec,
        });
      }
      t += s.targetDurationSec;
    }
    // Always ensure a 0:00 chapter exists
    if (!out.length || out[0].seconds !== 0) {
      out.unshift({
        time: '0:00',
        seconds: 0,
        title: 'Intro',
        role: 'intro',
        duration: this.store.scenes()[0]?.targetDurationSec ?? 0,
      });
    }
    return out;
  });

  readonly valid = computed(() => this.validate().ok);
  readonly invalidReason = computed(() => this.validate().reason);

  private validate(): { ok: boolean; reason: string } {
    const r = this.rows();
    if (r.length < 3) return { ok: false, reason: 'YouTube needs at least 3 chapters.' };
    if (r[0].seconds !== 0) return { ok: false, reason: 'First chapter must start at 0:00.' };
    for (let i = 1; i < r.length; i++) {
      if (r[i].seconds - r[i - 1].seconds < 10) {
        return { ok: false, reason: 'Each chapter must be at least 10 seconds long.' };
      }
    }
    return { ok: true, reason: '' };
  }

  private toText(): string {
    return this.rows().map(r => `${r.time} ${r.title}`).join('\n');
  }

  async copy() {
    await navigator.clipboard.writeText(this.toText());
    // Cheap "copied" flash — this file isn't re-rendering from a signal,
    // so use the native DOM for the flag flip.
    const btn = document.activeElement as HTMLElement | null;
    if (btn) btn.textContent = '✓ Copied';
    setTimeout(() => { if (btn) btn.textContent = 'Copy to clipboard'; }, 1500);
  }

  async download() {
    await this.exporter.exportChapters();
  }
}